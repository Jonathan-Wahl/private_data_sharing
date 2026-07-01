import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface VpnStatus {
  active: boolean;
  error?: string;
  internetValidated?: boolean;
  online?: boolean;
  platform: string;
  serviceRunning?: boolean;
}

interface NativeVpnStatusPlugin {
  getStatus(): Promise<VpnStatus>;
  openSettings(): Promise<void>;
}

const nativeVpnStatus = registerPlugin<NativeVpnStatusPlugin>('VpnStatus');

@Injectable({
  providedIn: 'root',
})
export class VpnStatusService {
  async getStatus(): Promise<VpnStatus> {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      return { active: false, platform };
    }

    try {
      return await nativeVpnStatus.getStatus();
    } catch (error) {
      return {
        active: false,
        error: error instanceof Error ? error.message : 'VPN status is unavailable.',
        platform,
      };
    }
  }

  async isActive(): Promise<boolean> {
    return (await this.getStatus()).active;
  }

  async waitForActive(
    options: { pollIntervalMs?: number; timeoutMs?: number } = {},
  ): Promise<VpnStatus> {
    const pollIntervalMs = options.pollIntervalMs ?? 1500;
    const timeoutMs = options.timeoutMs ?? 45_000;
    const startedAt = Date.now();
    let latest = await this.getStatus();

    while (!latest.active && Date.now() - startedAt < timeoutMs) {
      await this.delay(pollIntervalMs);
      latest = await this.getStatus();
    }

    return latest;
  }

  async openSettings(): Promise<void> {
    if (Capacitor.getPlatform() === 'android') {
      await nativeVpnStatus.openSettings();
    }
  }

  statusLabel(status: VpnStatus): string {
    if (status.online === false) {
      return 'Phone offline';
    }

    if (status.active && status.internetValidated === false) {
      return 'VPN active, internet unverified';
    }

    if (!status.active && status.serviceRunning) {
      return 'VPN tunnel not active';
    }

    return status.active ? 'VPN active' : 'VPN not active';
  }

  statusDetail(status: VpnStatus): string {
    if (status.error) {
      return `Android VPN status could not be read: ${status.error}`;
    }

    if (status.online === false) {
      return 'Android is not reporting any network with internet capability. Connect mobile data or Wi-Fi, then refresh.';
    }

    if (status.active) {
      if (status.internetValidated === false) {
        return 'Android reports a VPN tunnel, but has not validated internet access through it yet.';
      }

      return 'Android is routing app traffic through a VPN network.';
    }

    if (status.serviceRunning) {
      return 'The VPN service is running, but Android has not established a routed VPN tunnel.';
    }

    return 'Android is not reporting an active VPN network.';
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
