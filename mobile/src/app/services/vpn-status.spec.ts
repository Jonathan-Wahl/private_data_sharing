import { Capacitor } from '@capacitor/core';
import { describe, expect, it, vi } from 'vitest';

import { VpnStatusService } from './vpn-status';

describe('VpnStatusService', () => {
  it('reports web builds as unable to verify an Android VPN', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('web');
    const service = new VpnStatusService();

    await expect(service.getStatus()).resolves.toEqual({
      active: false,
      platform: 'web',
    });
  });

  it('labels active and inactive VPN states', () => {
    const service = new VpnStatusService();

    expect(service.statusLabel({ active: true, platform: 'android' })).toBe('VPN active');
    expect(service.statusLabel({ active: false, platform: 'android' })).toBe('VPN not active');
  });
});
