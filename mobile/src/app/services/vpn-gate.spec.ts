import { describe, expect, it } from 'vitest';

import { VpnGateService } from './vpn-gate';

describe('VpnGateService', () => {
  it('parses VPN Gate CSV rows into sorted server summaries', () => {
    const csv = [
      '*vpn_servers',
      '#HostName,IP,Score,Ping,Speed,CountryLong,CountryShort,NumVpnSessions,Uptime,TotalUsers,TotalTraffic,LogType,Operator,Message,OpenVPN_ConfigData_Base64',
      'slow,192.0.2.1,10,80,1000,Canada,CA,1,60,10,100,2weeks,operator,,',
      'fast,192.0.2.2,20,30,40000,Japan,JP,2,120,20,200,2weeks,operator,,Y29uZmln',
      '*',
    ].join('\n');
    const service = new VpnGateService();

    expect(service.parse(csv)).toEqual([
      expect.objectContaining({
        country: 'Japan',
        hasOpenVpnConfig: true,
        hostName: 'fast',
        ip: '192.0.2.2',
        ping: 30,
        speedMbps: 0.04,
      }),
      expect.objectContaining({
        country: 'Canada',
        hasOpenVpnConfig: false,
        hostName: 'slow',
      }),
    ]);
  });
});
