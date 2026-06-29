import { Injectable } from '@angular/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface VpnGateServer {
  country: string;
  countryCode: string;
  hasOpenVpnConfig: boolean;
  hostName: string;
  ip: string;
  ping: number;
  sessions: number;
  speedMbps: number;
  uptimeHours: number;
}

@Injectable({
  providedIn: 'root',
})
export class VpnGateService {
  private readonly endpoint = 'https://www.vpngate.net/api/iphone/';

  async list(): Promise<VpnGateServer[]> {
    const csv = await this.fetchCsv();

    return this.parse(csv);
  }

  parse(csv: string): VpnGateServer[] {
    const rows = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('*'));
    const headerIndex = rows.findIndex((line) => line.startsWith('#HostName'));

    if (headerIndex === -1) {
      throw new Error('VPN provider list did not include the expected server header.');
    }

    return rows
      .slice(headerIndex + 1)
      .map((line) => line.split(','))
      .filter((columns) => columns.length >= 15)
      .map((columns) => ({
        country: columns[5],
        countryCode: columns[6],
        hasOpenVpnConfig: columns[14].length > 0,
        hostName: columns[0],
        ip: columns[1],
        ping: Number(columns[3]) || 0,
        sessions: Number(columns[7]) || 0,
        speedMbps: Math.round(((Number(columns[4]) || 0) / 1_000_000) * 100) / 100,
        uptimeHours: Math.round(((Number(columns[8]) || 0) / 3600) * 10) / 10,
      }))
      .sort((left, right) => right.speedMbps - left.speedMbps);
  }

  private async fetchCsv(): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({
        headers: { Accept: 'text/plain' },
        responseType: 'text',
        url: this.endpoint,
      });

      if (response.status < 200 || response.status >= 300 || typeof response.data !== 'string') {
        throw new Error('VPN provider list could not be loaded.');
      }

      return response.data;
    }

    const response = await fetch(this.endpoint, {
      headers: { Accept: 'text/plain' },
    });

    if (!response.ok) {
      throw new Error('VPN provider list could not be loaded.');
    }

    return response.text();
  }
}
