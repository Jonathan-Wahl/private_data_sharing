import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it } from 'vitest';

import { DownloadHistoryService } from './download-history';
import { LocalStorageService } from './local-storage';
import { TorrentService } from './torrent';
import { VpnStatusService } from './vpn-status';

describe('TorrentService', () => {
  const inactiveVpn = {
    isActive: async () => false,
  } as VpnStatusService;

  const activeVpn = {
    isActive: async () => true,
  } as VpnStatusService;

  beforeEach(async () => {
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
        mode: 'webtorrent',
      }),
    );
  });

  it('stores whether a torrent requires VPN before starting', async () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      'magnet:?xt=urn:btih:0123456789abcdef&dn=Public%20Archive',
      true,
      true,
    );

    expect(job.vpnRequired).toBe(true);
  });

  it('blocks VPN-required torrents from running while VPN is inactive', async () => {
    const storage = new LocalStorageService();
    const service = new TorrentService(new DownloadHistoryService(storage), storage, inactiveVpn);
    const job = await service.addMagnet(
      'magnet:?xt=urn:btih:0123456789abcdef&dn=Public%20Archive',
      true,
      true,
    );

    await expect(service.setStatus(job.id, 'running')).rejects.toThrow(
      'Connect to VPN before starting this torrent.',
    );
  });

  it('allows VPN-required torrents to run when VPN is active', async () => {
    window.WebTorrent = class {
      add(_source: string | Uint8Array, onTorrent: (torrent: unknown) => void) {
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
      'magnet:?xt=urn:btih:0123456789abcdef&dn=Public%20Archive',
      true,
      true,
    );

    await expect(service.setStatus(job.id, 'running')).resolves.toEqual([
      expect.objectContaining({ id: job.id, status: 'running', vpnRequired: true }),
    ]);
  });
});
