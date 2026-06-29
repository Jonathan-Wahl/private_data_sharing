import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeVpnProfilePlugin {
  openOpenVpnProfile(options: { config: string; fileName: string }): Promise<void>;
}

const nativeVpnProfile = registerPlugin<NativeVpnProfilePlugin>('VpnProfile');

@Injectable({
  providedIn: 'root',
})
export class VpnProfileService {
  async openOpenVpnProfile(serverName: string, configBase64: string): Promise<void> {
    if (!configBase64) {
      throw new Error('This provider did not include an OpenVPN profile.');
    }

    const fileName = this.profileFileName(serverName);
    const config = this.decodeBase64(configBase64);

    if (Capacitor.getPlatform() === 'android') {
      await nativeVpnProfile.openOpenVpnProfile({ config, fileName });
      return;
    }

    this.downloadProfile(fileName, config);
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
