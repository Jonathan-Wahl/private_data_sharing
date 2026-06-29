import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

import { DownloadHistoryService } from './download-history';
import { LocalStorageService } from './local-storage';
import { VpnStatusService } from './vpn-status';

export type TorrentSourceType = 'magnet' | 'torrent-file';
export type TorrentStatus = 'cancelled' | 'complete' | 'error' | 'paused' | 'queued' | 'running';

export interface TorrentFileEntry {
  length: number;
  name: string;
}

export interface TorrentCompletedFile {
  href?: string;
  name: string;
  path?: string;
  size: number;
}

export interface TorrentJob {
  addedAt: string;
  completedFiles: TorrentCompletedFile[];
  downloadSpeed: number;
  error?: string;
  files: TorrentFileEntry[];
  id: string;
  legalAcknowledgement: true;
  name: string;
  peers: number;
  progress: number;
  source: string;
  sourceType: TorrentSourceType;
  status: TorrentStatus;
  uploadSpeed: number;
  vpnRequired: boolean;
}

export interface TorrentEngineStatus {
  canDownload: boolean;
  detail: string;
  mode: 'desktop-native' | 'webtorrent';
}

interface WebTorrentFile {
  arrayBuffer: () => Promise<ArrayBuffer>;
  blob?: () => Promise<Blob>;
  length: number;
  name: string;
  path?: string;
}

interface WebTorrentInstance {
  add: (
    source: ArrayBuffer | string | Uint8Array,
    onTorrent: (torrent: WebTorrentTorrent) => void,
  ) => void;
  destroy: () => void;
  on: (event: 'error', callback: (error: Error) => void) => void;
}

interface WebTorrentTorrent {
  downloadSpeed: number;
  files: WebTorrentFile[];
  name?: string;
  numPeers: number;
  pause: () => void;
  progress: number;
  removeAllListeners: () => void;
  resume: () => void;
  destroy: () => void;
  on: (
    event: 'done' | 'download' | 'error' | 'warning' | 'wire',
    callback: (value?: Error | number) => void,
  ) => void;
  uploadSpeed: number;
}

interface WebTorrentConstructor {
  new (): WebTorrentInstance;
}

interface DesktopTorrentApi {
  cancelTorrent: (id: string) => Promise<void>;
  onTorrentUpdate: (
    callback: (update: Partial<TorrentJob> & Pick<TorrentJob, 'id'>) => void,
  ) => () => void;
  pauseTorrent: (id: string) => Promise<void>;
  resumeTorrent: (id: string) => Promise<void>;
  startTorrent: (job: Pick<TorrentJob, 'id' | 'source' | 'sourceType'>) => Promise<void>;
}

declare global {
  interface Window {
    WebTorrent?: WebTorrentConstructor;
    secureShareDesktop?: DesktopTorrentApi;
  }
}

@Injectable({
  providedIn: 'root',
})
export class TorrentService {
  private readonly key = 'torrent:jobs';
  private readonly mobileDownloadDirectory = 'SecureShare/Torrents';
  private activeTorrents = new Map<string, WebTorrentTorrent>();
  private desktopUnsubscribe?: () => void;
  private scriptLoadPromise?: Promise<void>;
  private webTorrentClient?: WebTorrentInstance;

  constructor(
    private readonly history: DownloadHistoryService,
    private readonly storage: LocalStorageService,
    private readonly vpnStatus: VpnStatusService,
  ) {
    this.registerDesktopUpdates();
  }

  async addMagnet(
    magnetUri: string,
    legalAcknowledgement: boolean,
    vpnRequired: boolean,
  ): Promise<TorrentJob> {
    if (!legalAcknowledgement) {
      throw new Error('Legal torrent acknowledgement is required.');
    }

    if (!magnetUri.startsWith('magnet:?')) {
      throw new Error('Enter a valid magnet URI.');
    }

    return this.addJob({
      files: [],
      legalAcknowledgement: true,
      name: this.nameFromMagnet(magnetUri),
      source: magnetUri,
      sourceType: 'magnet',
      vpnRequired,
    });
  }

  async addTorrentFile(
    file: File,
    legalAcknowledgement: boolean,
    vpnRequired: boolean,
  ): Promise<TorrentJob> {
    if (!legalAcknowledgement) {
      throw new Error('Legal torrent acknowledgement is required.');
    }

    return this.addJob({
      files: [{ length: file.size, name: file.name }],
      legalAcknowledgement: true,
      name: file.name,
      source: await this.fileToBase64(file),
      sourceType: 'torrent-file',
      vpnRequired,
    });
  }

  engineStatus(): TorrentEngineStatus {
    if (this.desktopApi) {
      return {
        canDownload: true,
        detail:
          'Desktop builds use the Electron torrent engine and save finished files to your downloads folder.',
        mode: 'desktop-native',
      };
    }

    return {
      canDownload: true,
      detail:
        'This build downloads legal torrents with WebTorrent. Browser, Android, and iOS WebView downloads require WebRTC-capable torrent swarms and trackers.',
      mode: 'webtorrent',
    };
  }

  async list(): Promise<TorrentJob[]> {
    const jobs = await this.storage.getJson<TorrentJob[]>(this.key, []);

    return jobs.map((job) => ({
      ...job,
      completedFiles: job.completedFiles ?? [],
      vpnRequired: job.vpnRequired ?? false,
    }));
  }

  async remove(id: string): Promise<TorrentJob[]> {
    await this.cancelRuntimeDownload(id);

    const jobs = (await this.list()).filter((job) => job.id !== id);

    await this.storage.setJson(this.key, jobs);

    return jobs;
  }

  async setStatus(id: string, status: TorrentStatus): Promise<TorrentJob[]> {
    const jobs = await this.list();
    const target = jobs.find((job) => job.id === id);

    if (!target) {
      throw new Error('Torrent not found.');
    }

    if (status === 'running' && target?.vpnRequired && !(await this.vpnStatus.isActive())) {
      throw new Error('Connect to VPN before starting this torrent.');
    }

    if (status === 'running') {
      await this.startRuntimeDownload(target);
    } else if (status === 'paused') {
      await this.pauseRuntimeDownload(id);
    } else if (status === 'cancelled') {
      await this.cancelRuntimeDownload(id);
    }

    const updatedJobs = jobs.map((job) => {
      if (job.id !== id) {
        return job;
      }

      return {
        ...job,
        error: undefined,
        status,
        ...(status === 'running' ? {} : { downloadSpeed: 0, uploadSpeed: 0 }),
      };
    });

    await this.storage.setJson(this.key, updatedJobs);
    await this.history.update(id, {
      status: status === 'running' ? 'active' : this.toHistoryStatus(status),
    });

    return updatedJobs;
  }

  private async addJob(
    input: Pick<
      TorrentJob,
      'files' | 'legalAcknowledgement' | 'name' | 'source' | 'sourceType' | 'vpnRequired'
    >,
  ): Promise<TorrentJob> {
    const job: TorrentJob = {
      ...input,
      addedAt: new Date().toISOString(),
      completedFiles: [],
      downloadSpeed: 0,
      id: crypto.randomUUID(),
      peers: 0,
      progress: 0,
      status: 'queued',
      uploadSpeed: 0,
    };
    const jobs = await this.list();

    await this.storage.setJson(this.key, [job, ...jobs]);
    await this.history.add({
      bytesReceived: 0,
      id: job.id,
      kind: 'torrent',
      name: job.name,
      status: 'queued',
    });

    return job;
  }

  private get desktopApi(): DesktopTorrentApi | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return window.secureShareDesktop;
  }

  private async cancelRuntimeDownload(id: string): Promise<void> {
    const torrent = this.activeTorrents.get(id);

    if (torrent) {
      torrent.removeAllListeners();
      torrent.destroy();
      this.activeTorrents.delete(id);
    }

    if (this.desktopApi) {
      await this.desktopApi.cancelTorrent(id);
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

    return btoa(binary);
  }

  private async finishBrowserDownload(id: string, torrent: WebTorrentTorrent): Promise<void> {
    const completedFiles = await Promise.all(
      torrent.files.map(async (file) => {
        const name = file.path ?? file.name;
        const safePath = this.safePath(name);

        if (Capacitor.isNativePlatform()) {
          const buffer = await file.arrayBuffer();
          const path = `${this.mobileDownloadDirectory}/${safePath}`;

          await Filesystem.mkdir({
            directory: Directory.Documents,
            path: this.mobileDownloadDirectory,
            recursive: true,
          }).catch(() => undefined);
          await Filesystem.writeFile({
            data: this.arrayBufferToBase64(buffer),
            directory: Directory.Documents,
            path,
            recursive: true,
          });

          return { name, path: `Documents/${path}`, size: file.length };
        }

        const blob = file.blob ? await file.blob() : new Blob([await file.arrayBuffer()]);

        return {
          href: URL.createObjectURL(blob),
          name,
          size: file.length,
        };
      }),
    );

    await this.updateJob(id, {
      completedFiles,
      downloadSpeed: 0,
      peers: torrent.numPeers,
      progress: 100,
      status: 'complete',
      uploadSpeed: 0,
    });
    await this.history.update(id, { status: 'complete' });
  }

  private async ensureWebTorrentClient(): Promise<WebTorrentInstance> {
    if (this.webTorrentClient) {
      return this.webTorrentClient;
    }

    const browserWindow = this.getBrowserWindow();

    if (!browserWindow) {
      throw new Error('Torrent downloads require a browser or desktop runtime.');
    }

    if (!browserWindow.WebTorrent) {
      this.scriptLoadPromise ??= this.loadWebTorrentScript();
      await this.scriptLoadPromise;
    }

    if (!browserWindow.WebTorrent) {
      throw new Error('Torrent engine failed to load.');
    }

    this.webTorrentClient = new browserWindow.WebTorrent();
    this.webTorrentClient.on('error', (error) => {
      console.error('Torrent engine error', error);
    });

    return this.webTorrentClient;
  }

  private loadWebTorrentScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Torrent engine failed to load.'));
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-secure-share-webtorrent]',
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Torrent engine failed to load.')),
          {
            once: true,
          },
        );
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.dataset['secureShareWebtorrent'] = 'true';
      script.src = 'assets/vendor/webtorrent.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Torrent engine failed to load.'));
      document.head.appendChild(script);
    });
  }

  private nameFromMagnet(magnetUri: string): string {
    const params = new URLSearchParams(magnetUri.slice('magnet:?'.length));
    const displayName = params.get('dn');

    return displayName ? decodeURIComponent(displayName) : 'Magnet download';
  }

  private async pauseRuntimeDownload(id: string): Promise<void> {
    const torrent = this.activeTorrents.get(id);

    if (torrent) {
      torrent.pause();
    }

    if (this.desktopApi) {
      await this.desktopApi.pauseTorrent(id);
    }
  }

  private registerDesktopUpdates(): void {
    if (!this.desktopApi || this.desktopUnsubscribe) {
      return;
    }

    this.desktopUnsubscribe = this.desktopApi.onTorrentUpdate((update) => {
      void this.updateJob(update.id, update);
    });
  }

  private async startRuntimeDownload(job: TorrentJob): Promise<void> {
    if (this.desktopApi) {
      await this.desktopApi.startTorrent({
        id: job.id,
        source: job.source,
        sourceType: job.sourceType,
      });
      return;
    }

    if (this.activeTorrents.has(job.id)) {
      this.activeTorrents.get(job.id)?.resume();
      return;
    }

    const client = await this.ensureWebTorrentClient();
    const source = job.sourceType === 'magnet' ? job.source : this.base64ToUint8Array(job.source);

    client.add(source, (torrent) => {
      this.activeTorrents.set(job.id, torrent);
      void this.updateJob(job.id, {
        files: torrent.files.map((file) => ({ length: file.length, name: file.path ?? file.name })),
        name: torrent.name || job.name,
        peers: torrent.numPeers,
        status: 'running',
      });

      torrent.on('download', () => {
        void this.updateJob(job.id, {
          downloadSpeed: Math.round(torrent.downloadSpeed),
          peers: torrent.numPeers,
          progress: Math.round(torrent.progress * 100),
          status: 'running',
          uploadSpeed: Math.round(torrent.uploadSpeed),
        });
      });

      torrent.on('wire', () => {
        void this.updateJob(job.id, { peers: torrent.numPeers });
      });

      torrent.on('warning', (warning) => {
        console.warn('Torrent warning', warning);
      });

      torrent.on('error', (error) => {
        void this.updateJob(job.id, {
          downloadSpeed: 0,
          error: error instanceof Error ? error.message : 'Torrent download failed.',
          status: 'error',
          uploadSpeed: 0,
        });
        void this.history.update(job.id, { status: 'failed' });
      });

      torrent.on('done', () => {
        this.activeTorrents.delete(job.id);
        void this.finishBrowserDownload(job.id, torrent);
      });
    });
  }

  private toHistoryStatus(status: TorrentStatus) {
    if (status === 'complete') {
      return 'complete';
    }

    if (status === 'error') {
      return 'failed';
    }

    if (status === 'paused') {
      return 'paused';
    }

    return 'queued';
  }

  private getBrowserWindow(): Window | undefined {
    return typeof window === 'undefined' ? undefined : window;
  }

  private async updateJob(id: string, update: Partial<TorrentJob>): Promise<void> {
    const jobs = await this.list();
    const nextJobs = jobs.map((job) => (job.id === id ? { ...job, ...update } : job));

    await this.storage.setJson(this.key, nextJobs);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let index = 0; index < bytes.byteLength; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary);
  }

  private base64ToUint8Array(source: string): Uint8Array {
    const binary = atob(source);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  private safePath(path: string): string {
    return path
      .split('/')
      .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, '_'))
      .filter(Boolean)
      .join('/');
  }
}
