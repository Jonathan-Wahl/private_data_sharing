import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface VpnStatus {
  active: boolean;
  platform: string;
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
    } catch {
      return { active: false, platform };
    }
  }

  async isActive(): Promise<boolean> {
    return (await this.getStatus()).active;
  }

  async openSettings(): Promise<void> {
    if (Capacitor.getPlatform() === 'android') {
      await nativeVpnStatus.openSettings();
    }
  }

  statusLabel(status: VpnStatus): string {
    return status.active ? 'VPN active' : 'VPN not active';
  }
}
