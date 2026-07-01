import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeVpnProfilePlugin {
  connectOpenVpnProfile(options: { config: string }): Promise<VpnProfileStatus>;
  disconnect(): Promise<VpnProfileStatus>;
  getStatus(): Promise<VpnProfileStatus>;
}

const nativeVpnProfile = registerPlugin<NativeVpnProfilePlugin>('VpnProfile');

export interface VpnProfileStatus {
  active: boolean;
  internetValidated?: boolean;
  online?: boolean;
  platform: string;
  serviceRunning?: boolean;
  state: 'connected' | 'connecting' | 'disconnected' | 'disconnecting' | 'downloaded';
}

@Injectable({
  providedIn: 'root',
})
export class VpnProfileService {
  async connectOpenVpnProfile(serverName: string, configBase64: string): Promise<VpnProfileStatus> {
    if (!configBase64) {
      throw new Error('This provider did not include an OpenVPN profile.');
    }

    const fileName = this.profileFileName(serverName);
    const config = this.decodeBase64(configBase64);

    if (Capacitor.getPlatform() === 'android') {
      return nativeVpnProfile.connectOpenVpnProfile({ config });
    }

    this.downloadProfile(fileName, config);

    return {
      active: false,
      platform: Capacitor.getPlatform(),
      state: 'downloaded',
    };
  }

  async disconnect(): Promise<VpnProfileStatus> {
    if (Capacitor.getPlatform() === 'android') {
      return nativeVpnProfile.disconnect();
    }

    return {
      active: false,
      platform: Capacitor.getPlatform(),
      state: 'disconnected',
    };
  }

  async getStatus(): Promise<VpnProfileStatus> {
    if (Capacitor.getPlatform() === 'android') {
      return nativeVpnProfile.getStatus();
    }

    return {
      active: false,
      platform: Capacitor.getPlatform(),
      state: 'disconnected',
    };
  }

  profileFileName(serverName: string): string {
    const safeName = serverName
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return `${safeName || 'vpn-profile'}.ovpn`;
  }

  private decodeBase64(value: string): string {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return new TextDecoder().decode(bytes);
  }

  private downloadProfile(fileName: string, config: string): void {
    const url = URL.createObjectURL(
      new Blob([config], {
        type: 'application/x-openvpn-profile',
      }),
    );
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
