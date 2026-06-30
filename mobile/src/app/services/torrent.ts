import { Injectable } from '@angular/core';
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

import { DownloadHistoryService } from './download-history';
import { LocalStorageService } from './local-storage';
import { createUuid } from './uuid';
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
  announcingToDht?: boolean;
  announcingToTrackers?: boolean;
  connectCandidates?: number;
  connections?: number;
  completedFiles: TorrentCompletedFile[];
  currentTracker?: string;
  dhtNodes?: number;
  dhtRunning?: boolean;
  downloadSpeed: number;
  error?: string;
  files: TorrentFileEntry[];
  firewalled?: boolean;
  hasMetadata?: boolean;
  id: string;
  listenEndpoints?: string[];
  nativeAlert?: string;
  nativeState?: string;
  name: string;
  peers: number;
  progress: number;
  seeds?: number;
  sessionPaused?: boolean;
  source: string;
  sourceType: TorrentSourceType;
  status: TorrentStatus;
  uploadSpeed: number;
  vpnRequired: boolean;
}

export interface TorrentEngineStatus {
  canDownload: boolean;
  detail: string;
  mode: 'android-native' | 'desktop-native' | 'webtorrent';
}

const WEBTORRENT_TRACKERS = [
  'wss://tracker.btorrent.xyz',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
];

const CLASSIC_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://exodus.desync.com:6969/announce',
  'http://tracker.opentrackr.org:1337/announce',
  'http://tracker2.dler.org:80/announce',
  'https://tracker.bt4g.com:443/announce',
  'https://tracker.zhuqiy.com:443/announce',
];

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
    options: { announce: string[] },
    onTorrent: (torrent: WebTorrentTorrent) => void,
  ) => void;
  destroy: () => void;
  get?: (torrentId: string) => Promise<WebTorrentTorrent | null>;
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
  infoHash?: string;
  on: (
    event: 'done' | 'download' | 'error' | 'noPeers' | 'warning' | 'wire',
    callback: (value?: Error | number | string) => void,
  ) => void;
  uploadSpeed: number;
}

interface WebTorrentConstructor {
  new (options?: { tracker?: { announce?: string[] } }): WebTorrentInstance;
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

interface NativeTorrentApi {
  addListener: (
    eventName: 'torrentUpdate',
    callback: (update: Partial<TorrentJob> & Pick<TorrentJob, 'id'>) => void,
  ) => Promise<PluginListenerHandle>;
  cancelTorrent: (job: Pick<TorrentJob, 'id'>) => Promise<void>;
  isAvailable: () => Promise<{ available: boolean; platform: string }>;
  pauseTorrent: (job: Pick<TorrentJob, 'id'>) => Promise<void>;
  resumeTorrent: (job: Pick<TorrentJob, 'id'>) => Promise<void>;
  startTorrent: (job: Pick<TorrentJob, 'id' | 'source' | 'sourceType'>) => Promise<void>;
}

declare global {
  interface Window {
    WebTorrent?: WebTorrentConstructor;
    secureShareDesktop?: DesktopTorrentApi;
  }
}

const nativeTorrent = registerPlugin<NativeTorrentApi>('NativeTorrent');

@Injectable({
  providedIn: 'root',
})
export class TorrentService {
  private readonly key = 'torrent:jobs';
  private readonly mobileDownloadDirectory = 'SecureShare/Torrents';
  private activeTorrents = new Map<string, WebTorrentTorrent>();
  private pendingBrowserTorrentStarts = new Set<string>();
  private desktopUnsubscribe?: () => void;
  private nativeListener?: Promise<PluginListenerHandle>;
  private scriptLoadPromise?: Promise<void>;
  private webTorrentClient?: WebTorrentInstance;

  constructor(
    private readonly history: DownloadHistoryService,
    private readonly storage: LocalStorageService,
    private readonly vpnStatus: VpnStatusService,
  ) {
    this.registerDesktopUpdates();
    this.registerNativeUpdates();
  }

  async addMagnet(magnetUri: string, vpnRequired: boolean): Promise<TorrentJob> {
    if (!magnetUri.startsWith('magnet:?')) {
      throw new Error('Enter a valid magnet URI.');
    }

    const normalizedMagnetUri = this.withWebTorrentTrackers(magnetUri);

    return this.addJob({
      files: [],
      name: this.nameFromMagnet(normalizedMagnetUri),
      source: normalizedMagnetUri,
      sourceType: 'magnet',
      vpnRequired,
    });
  }

  async addTorrentFile(file: File, vpnRequired: boolean): Promise<TorrentJob> {
    return this.addJob({
      files: [{ length: file.size, name: file.name }],
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
          'Desktop builds use the Electron torrent engine with classic BitTorrent peer discovery, DHT, UDP/HTTP/WebSocket trackers, and finished files saved to your downloads folder.',
        mode: 'desktop-native',
      };
    }

    if (this.nativeApi) {
      return {
        canDownload: true,
        detail:
          'Android builds use the native libtorrent engine for classic BitTorrent peers, UDP trackers, DHT, and WebTorrent-compatible trackers.',
        mode: 'android-native',
      };
    }

    if (Capacitor.getPlatform() === 'ios') {
      return {
        canDownload: true,
        detail:
          'iOS WebView builds use WebTorrent with WebSocket trackers. iOS WebViews cannot use UDP trackers, DHT, TCP, or uTP sockets from JavaScript.',
        mode: 'webtorrent',
      };
    }

    return {
      canDownload: true,
      detail:
        'Web builds use WebTorrent with WebSocket trackers. Browsers cannot use UDP trackers, DHT, TCP, or uTP sockets from JavaScript.',
      mode: 'webtorrent',
    };
  }

  async list(): Promise<TorrentJob[]> {
    const jobs = await this.storage.getJson<TorrentJob[]>(this.key, []);

    return jobs.map((job) => ({
      ...job,
      completedFiles: job.completedFiles ?? [],
      source: job.sourceType === 'magnet' ? this.repairMagnetIdentifier(job.source) : job.source,
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
      throw new Error(
        'This torrent requires a connected VPN. Turn off its VPN requirement or connect a working VPN before starting.',
      );
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

    try {
      if (status === 'running') {
        await this.startRuntimeDownload({ ...target, status });
      } else if (status === 'paused') {
        await this.pauseRuntimeDownload(id);
      } else if (status === 'cancelled') {
        await this.cancelRuntimeDownload(id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update torrent.';
      await this.updateJob(id, {
        downloadSpeed: 0,
        error: message,
        status: 'error',
        uploadSpeed: 0,
      });
      await this.history.update(id, { status: 'failed' });
      throw error;
    }

    return updatedJobs;
  }

  async updateVpnRequired(id: string, vpnRequired: boolean): Promise<TorrentJob[]> {
    const jobs = await this.list();
    const target = jobs.find((job) => job.id === id);

    if (!target) {
      throw new Error('Torrent not found.');
    }

    if (!vpnRequired && target.status === 'running') {
      throw new Error('Pause this torrent before changing its VPN requirement.');
    }

    const updatedJobs = jobs.map((job) => (job.id === id ? { ...job, vpnRequired } : job));

    await this.storage.setJson(this.key, updatedJobs);

    return updatedJobs;
  }

  private async addJob(
    input: Pick<TorrentJob, 'files' | 'name' | 'source' | 'sourceType' | 'vpnRequired'>,
  ): Promise<TorrentJob> {
    const job: TorrentJob = {
      ...input,
      addedAt: new Date().toISOString(),
      completedFiles: [],
      downloadSpeed: 0,
      id: createUuid(),
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

  private get nativeApi(): NativeTorrentApi | undefined {
    return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
      ? nativeTorrent
      : undefined;
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

    if (this.nativeApi) {
      await this.nativeApi.cancelTorrent({ id });
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

  private attachBrowserTorrent(job: TorrentJob, torrent: WebTorrentTorrent): void {
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
        error: undefined,
        peers: torrent.numPeers,
        progress: Math.round(torrent.progress * 100),
        status: 'running',
        uploadSpeed: Math.round(torrent.uploadSpeed),
      });
    });

    torrent.on('wire', () => {
      void this.updateJob(job.id, { error: undefined, peers: torrent.numPeers });
    });

    torrent.on('noPeers', (source) => {
      const sourceName = typeof source === 'string' ? source : 'trackers';
      void this.updateJob(job.id, {
        error: `No WebTorrent peers found from ${sourceName}. Browser downloads can only connect to WebRTC/WebTorrent peers; use Android or desktop for classic BitTorrent swarms.`,
      });
    });

    torrent.on('warning', (warning) => {
      console.warn('Torrent warning', warning);
    });

    torrent.on('error', (error) => {
      this.pendingBrowserTorrentStarts.delete(this.browserTorrentStartKey(job));
      void this.updateJob(job.id, {
        downloadSpeed: 0,
        error: error instanceof Error ? error.message : 'Torrent download failed.',
        status: 'error',
        uploadSpeed: 0,
      });
      void this.history.update(job.id, { status: 'failed' });
    });

    torrent.on('done', () => {
      this.pendingBrowserTorrentStarts.delete(this.browserTorrentStartKey(job));
      this.activeTorrents.delete(job.id);
      void this.finishBrowserDownload(job.id, torrent);
    });
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

    this.webTorrentClient = new browserWindow.WebTorrent({
      tracker: {
        announce: WEBTORRENT_TRACKERS,
      },
    });
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
      script.src = 'assets/vendor/webtorrent.min.js?v=webtorrent-3.0.16-chrome83-global';
      script.onload = () => {
        if (this.getBrowserWindow()?.WebTorrent) {
          resolve();
          return;
        }

        script.remove();
        reject(new Error('Torrent engine loaded but did not initialize WebTorrent.'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Torrent engine script could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }

  private nameFromMagnet(magnetUri: string): string {
    const params = new URLSearchParams(magnetUri.slice('magnet:?'.length));
    const displayName = params.get('dn');

    return displayName || 'Magnet download';
  }

  private async pauseRuntimeDownload(id: string): Promise<void> {
    const torrent = this.activeTorrents.get(id);

    if (torrent) {
      torrent.pause();
    }

    if (this.desktopApi) {
      await this.desktopApi.pauseTorrent(id);
    }

    if (this.nativeApi) {
      await this.nativeApi.pauseTorrent({ id });
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

  private registerNativeUpdates(): void {
    if (!this.nativeApi || this.nativeListener) {
      return;
    }

    this.nativeListener = this.nativeApi
      .addListener('torrentUpdate', (update) => {
        void this.updateJob(update.id, update);
        if (update.status === 'complete') {
          void this.history.update(update.id, { status: 'complete' });
        } else if (update.status === 'error') {
          void this.history.update(update.id, { status: 'failed' });
        }
      })
      .catch(() => ({
        remove: async () => undefined,
      }));
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

    if (this.nativeApi) {
      await this.nativeApi.startTorrent({
        id: job.id,
        source: job.sourceType === 'magnet' ? this.withClassicTrackers(job.source) : job.source,
        sourceType: job.sourceType,
      });
      return;
    }

    if (this.activeTorrents.has(job.id)) {
      this.activeTorrents.get(job.id)?.resume();
      return;
    }

    const startKey = this.browserTorrentStartKey(job);

    if (this.pendingBrowserTorrentStarts.has(startKey)) {
      return;
    }

    const client = await this.ensureWebTorrentClient();
    const source = job.sourceType === 'magnet' ? job.source : this.base64ToUint8Array(job.source);
    const existingTorrent =
      job.sourceType === 'magnet' ? await client.get?.(this.magnetInfoHash(job.source)) : undefined;

    if (existingTorrent) {
      existingTorrent.resume();
      this.attachBrowserTorrent(job, existingTorrent);
      return;
    }

    this.pendingBrowserTorrentStarts.add(startKey);

    try {
      client.add(source, { announce: WEBTORRENT_TRACKERS }, (torrent) => {
        this.pendingBrowserTorrentStarts.delete(startKey);
        this.attachBrowserTorrent(job, torrent);
      });
    } catch (error) {
      this.pendingBrowserTorrentStarts.delete(startKey);
      throw error;
    }
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
    const nextJobs = jobs.map((job) => {
      if (job.id !== id) {
        return job;
      }

      if (job.status === 'paused' && update.status === 'running') {
        return {
          ...job,
          ...update,
          downloadSpeed: 0,
          status: 'paused',
          uploadSpeed: 0,
        };
      }

      return { ...job, ...update };
    });

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

  private browserTorrentStartKey(job: TorrentJob): string {
    if (job.sourceType !== 'magnet') {
      return job.id;
    }

    return this.magnetInfoHash(job.source);
  }

  private magnetInfoHash(magnetUri: string): string {
    const params = new URLSearchParams(this.repairMagnetIdentifier(magnetUri).slice('magnet:?'.length));
    const exactTopic = params
      .getAll('xt')
      .find((topic) => topic.toLowerCase().startsWith('urn:btih:'));

    return exactTopic?.slice('urn:btih:'.length).toLowerCase() ?? magnetUri;
  }

  private safePath(path: string): string {
    return path
      .split('/')
      .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, '_'))
      .filter(Boolean)
      .join('/');
  }

  private withWebTorrentTrackers(magnetUri: string): string {
    return this.withTrackers(magnetUri, WEBTORRENT_TRACKERS);
  }

  private withClassicTrackers(magnetUri: string): string {
    return this.withTrackers(magnetUri, CLASSIC_TRACKERS);
  }

  private withTrackers(magnetUri: string, trackers: string[]): string {
    const [withoutFragment, fragment = ''] = magnetUri.split('#', 2);
    const queryStart = withoutFragment.indexOf('?');

    if (!withoutFragment.startsWith('magnet:?') || queryStart < 0) {
      return magnetUri;
    }

    const query = withoutFragment.slice(queryStart + 1);
    const existingTrackers = new Set(new URLSearchParams(query).getAll('tr'));
    const missingTrackers = trackers.filter((tracker) => !existingTrackers.has(tracker));

    if (missingTrackers.length === 0) {
      return this.repairMagnetIdentifier(magnetUri);
    }

    const separator =
      withoutFragment.endsWith('?') || withoutFragment.endsWith('&') ? '' : '&';
    const appendedTrackers = missingTrackers
      .map((tracker) => `tr=${encodeURIComponent(tracker)}`)
      .join('&');
    const nextMagnet = `${withoutFragment}${separator}${appendedTrackers}`;

    return this.repairMagnetIdentifier(fragment ? `${nextMagnet}#${fragment}` : nextMagnet);
  }

  private repairMagnetIdentifier(magnetUri: string): string {
    return magnetUri.replace(/([?&]xt=)urn%3Abtih%3A([^&#]+)/i, '$1urn:btih:$2');
  }
}
