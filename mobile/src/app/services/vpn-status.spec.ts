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
    expect(service.statusLabel({ active: false, platform: 'android', serviceRunning: true })).toBe(
      'VPN tunnel not active',
    );
  });

  it('describes running VPN services that have not established a tunnel', () => {
    const service = new VpnStatusService();

    expect(service.statusDetail({ active: false, platform: 'android', serviceRunning: true })).toBe(
      'The VPN service is running, but Android has not established a routed VPN tunnel.',
    );
  });

  it('waits until Android reports an active VPN network', async () => {
    vi.useFakeTimers();

    const service = new VpnStatusService();
    const statuses = [
      { active: false, platform: 'android', serviceRunning: true },
      { active: false, platform: 'android', serviceRunning: true },
      { active: true, platform: 'android', serviceRunning: true },
    ];

    vi.spyOn(service, 'getStatus').mockImplementation(async () => statuses.shift() ?? statuses[0]);

    const result = service.waitForActive({ pollIntervalMs: 1000, timeoutMs: 5000 });

    await vi.advanceTimersByTimeAsync(2000);

    await expect(result).resolves.toEqual({
      active: true,
      platform: 'android',
      serviceRunning: true,
    });

    vi.useRealTimers();
  });
});
