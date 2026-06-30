import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DownloadHistoryService } from './download-history';
import { LocalStorageService } from './local-storage';
import { TorrentService } from './torrent';
import { VpnStatusService } from './vpn-status';

describe('TorrentService', () => {
  const validInfoHash = 'C0A278EBF5EA5D140967DA7B8D0ED855F930846D';
  const inactiveVpn = {
    isActive: async () => false,
  } as VpnStatusService;

  const activeVpn = {
    isActive: async () => true,
  } as VpnStatusService;

  beforeEach(async () => {
    vi.restoreAllMocks();
    await Preferences.clear();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
      writable: true,
    });
    window.WebTorrent = undefined;
    window.secureShareDesktop = undefined;
  });

  it('reports that WebTorrent transport is available', () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);

    expect(service.engineStatus()).toEqual(
      expect.objectContaining({
        canDownload: true,
        detail: expect.stringContaining('Browsers cannot use UDP trackers'),
        mode: 'webtorrent',
      }),
    );
  });

  it('reports iOS WebView transport limits explicitly', () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);

    expect(service.engineStatus()).toEqual(
      expect.objectContaining({
        detail: expect.stringContaining('iOS WebViews cannot use UDP trackers'),
        mode: 'webtorrent',
      }),
    );
  });

  it('reports Electron as classic BitTorrent capable', () => {
    window.secureShareDesktop = {
      cancelTorrent: async () => undefined,
      onTorrentUpdate: () => () => undefined,
      pauseTorrent: async () => undefined,
      resumeTorrent: async () => undefined,
      startTorrent: async () => undefined,
    };
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);

    expect(service.engineStatus()).toEqual(
      expect.objectContaining({
        detail: expect.stringContaining('classic BitTorrent peer discovery'),
        mode: 'desktop-native',
      }),
    );
  });

  it('stores whether a torrent requires VPN before starting', async () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive`,
      true,
    );

    expect(job.vpnRequired).toBe(true);
  });

  it('adds WebTorrent trackers to magnet links for browser peer discovery', async () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive`,
      false,
    );
    const params = new URLSearchParams(job.source.slice('magnet:?'.length));

    expect(params.getAll('tr')).toEqual(
      expect.arrayContaining([
        'wss://tracker.btorrent.xyz',
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.webtorrent.dev',
      ]),
    );
  });

  it('preserves the unescaped magnet xt identifier required by WebTorrent', async () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337`,
      false,
    );

    expect(job.source).toContain(`xt=urn:btih:${validInfoHash}`);
    expect(job.source).not.toContain('xt=urn%3Abtih%3A');
    expect(job.source).toContain('tr=wss%3A%2F%2Ftracker.webtorrent.dev');
  });

  it('repairs already stored magnets with escaped xt identifiers', async () => {
    const storage = new LocalStorageService();
    await storage.setJson('torrent:jobs', [
      {
        addedAt: new Date().toISOString(),
        completedFiles: [],
        downloadSpeed: 0,
        files: [],
        id: 'stored-magnet',
        name: 'Public Archive',
        peers: 0,
        progress: 0,
        source: `magnet:?xt=urn%3Abtih%3A${validInfoHash}&dn=Public+Archive`,
        sourceType: 'magnet',
        status: 'queued',
        uploadSpeed: 0,
        vpnRequired: false,
      },
    ]);
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({
        source: expect.stringContaining(`xt=urn:btih:${validInfoHash}`),
      }),
    ]);
  });

  it('keeps existing magnet trackers while adding missing WebTorrent trackers', async () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive&tr=wss%3A%2F%2Fexample.test`,
      false,
    );
    const params = new URLSearchParams(job.source.slice('magnet:?'.length));

    expect(params.getAll('tr')).toEqual(
      expect.arrayContaining(['wss://example.test', 'wss://tracker.webtorrent.dev']),
    );
  });

  it('preserves decoded magnet display names with literal percent characters', async () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20100%25%20Archive`,
      false,
    );

    expect(job.name).toBe('Public 100% Archive');
  });

  it('blocks VPN-required torrents from running while VPN is inactive', async () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive`,
      true,
    );

    await expect(service.setStatus(job.id, 'running')).rejects.toThrow(
      'This torrent requires a connected VPN. Turn off its VPN requirement or connect a working VPN before starting.',
    );
  });

  it('allows queued torrents to change whether VPN is required', async () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive`,
      true,
    );

    await expect(service.updateVpnRequired(job.id, false)).resolves.toEqual([
      expect.objectContaining({ id: job.id, vpnRequired: false }),
    ]);
  });

  it('allows VPN-required torrents to run when VPN is active', async () => {
    const addCalls: { options: { announce: string[] }; source: string | Uint8Array }[] = [];

    window.WebTorrent = class {
      add(
        source: string | Uint8Array,
        options: { announce: string[] },
        onTorrent: (torrent: unknown) => void,
      ) {
        addCalls.push({ options, source });
        onTorrent({
          downloadSpeed: 0,
          files: [],
          name: 'Public Archive',
          numPeers: 0,
          on: () => undefined,
          pause: () => undefined,
          progress: 0,
          removeAllListeners: () => undefined,
          resume: () => undefined,
          destroy: () => undefined,
          uploadSpeed: 0,
        });
      }

      destroy() {
        return undefined;
      }

      on() {
        return undefined;
      }
    };

    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, activeVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive`,
      true,
    );

    await expect(service.setStatus(job.id, 'running')).resolves.toEqual([
      expect.objectContaining({ id: job.id, status: 'running', vpnRequired: true }),
    ]);
    expect(addCalls).toEqual([
      expect.objectContaining({
        options: {
          announce: expect.arrayContaining(['wss://tracker.webtorrent.dev']),
        },
      }),
    ]);
  });

  it('does not add the same browser magnet twice while the first start is pending', async () => {
    const addCalls: string[] = [];

    window.WebTorrent = class {
      add(source: string | Uint8Array) {
        addCalls.push(String(source));
      }

      destroy() {
        return undefined;
      }

      on() {
        return undefined;
      }
    };

    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive`,
      false,
    );

    await service.setStatus(job.id, 'running');
    await service.setStatus(job.id, 'running');

    expect(addCalls).toHaveLength(1);
  });

  it('explains when browser tracker discovery finds no WebTorrent peers', async () => {
    let noPeersCallback: ((source: string) => void) | undefined;

    window.WebTorrent = class {
      add(
        _source: string | Uint8Array,
        _options: { announce: string[] },
        onTorrent: (torrent: unknown) => void,
      ) {
        onTorrent({
          destroy: () => undefined,
          downloadSpeed: 0,
          files: [],
          name: 'Public Archive',
          numPeers: 0,
          on: (event: string, callback: (source: string) => void) => {
            if (event === 'noPeers') {
              noPeersCallback = callback;
            }
          },
          pause: () => undefined,
          progress: 0,
          removeAllListeners: () => undefined,
          resume: () => undefined,
          uploadSpeed: 0,
        });
      }

      destroy() {
        return undefined;
      }

      on() {
        return undefined;
      }
    };

    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive`,
      false,
    );

    await service.setStatus(job.id, 'running');
    noPeersCallback?.('tracker');
    await new Promise((resolve) => setTimeout(resolve));

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({
        error: expect.stringContaining('Browser downloads can only connect to WebRTC/WebTorrent peers'),
        id: job.id,
        status: 'running',
      }),
    ]);
  });

  it('awaits and resumes an existing browser torrent instead of adding a duplicate', async () => {
    const resume = vi.fn();
    const torrent = {
      destroy: () => undefined,
      downloadSpeed: 0,
      files: [],
      name: 'Public Archive',
      numPeers: 0,
      on: () => undefined,
      pause: () => undefined,
      progress: 0,
      removeAllListeners: () => undefined,
      resume,
      uploadSpeed: 0,
    };

    window.WebTorrent = class {
      add() {
        throw new Error('client.add should not run for an existing torrent');
      }

      destroy() {
        return undefined;
      }

      async get(torrentId: string) {
        return torrentId === validInfoHash.toLowerCase() ? torrent : null;
      }

      on() {
        return undefined;
      }
    };

    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      `magnet:?xt=urn:btih:${validInfoHash}&dn=Public%20Archive`,
      false,
    );

    await service.setStatus(job.id, 'running');

    expect(resume).toHaveBeenCalledOnce();
  });
});
