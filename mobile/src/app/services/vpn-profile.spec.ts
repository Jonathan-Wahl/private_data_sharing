import { describe, expect, it } from 'vitest';

import { VpnProfileService } from './vpn-profile';

describe('VpnProfileService', () => {
  it('creates safe OpenVPN profile filenames', () => {
    const service = new VpnProfileService();

    expect(service.profileFileName('JP/Tokyo VPN 1')).toBe('JP_Tokyo_VPN_1.ovpn');
    expect(service.profileFileName('')).toBe('vpn-profile.ovpn');
  });
});
