import { Component, OnInit } from '@angular/core';

import { VpnGateServer, VpnGateService } from '../../services/vpn-gate';
import { VpnProfileService, VpnProfileStatus } from '../../services/vpn-profile';
import { VpnStatus, VpnStatusService } from '../../services/vpn-status';

@Component({
  selector: 'app-vpn',
  templateUrl: './vpn.page.html',
  styleUrls: ['./vpn.page.scss'],
  standalone: false,
})
export class VpnPage implements OnInit {
  error = '';
  lastCheckedAt = '';
  loading = false;
  openingServer = '';
  profileStatus: VpnProfileStatus = {
    active: false,
    platform: 'unknown',
    state: 'disconnected',
  };
  selectedServer = '';
  servers: VpnGateServer[] = [];
  status: VpnStatus = {
    active: false,
    platform: 'unknown',
  };

  constructor(
    private readonly vpnGate: VpnGateService,
    private readonly vpnProfile: VpnProfileService,
    private readonly vpnStatus: VpnStatusService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.refreshStatus();
    await this.refreshProfileStatus();
  }

  async checkProviderList(): Promise<void> {
    this.error = '';
    this.loading = true;

    try {
      this.servers = (await this.vpnGate.list()).slice(0, 25);
      this.lastCheckedAt = new Date().toLocaleString();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to load VPN provider list.';
    } finally {
      this.loading = false;
    }
  }

  openProviderList(): void {
    window.open('https://www.vpngate.net/en/', '_blank', 'noopener,noreferrer');
  }

  async connectToProvider(server: VpnGateServer): Promise<void> {
    this.error = '';
    this.openingServer = server.hostName;
    this.selectedServer = server.hostName;

    try {
      this.profileStatus = await this.vpnProfile.connectOpenVpnProfile(
        server.hostName,
        server.openVpnConfigBase64,
      );
      this.status = await this.vpnStatus.waitForActive();
      await this.refreshProfileStatus();
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : 'Unable to open this VPN profile on this device.';
    } finally {
      this.openingServer = '';
    }
  }

  async disconnect(): Promise<void> {
    this.error = '';

    try {
      this.profileStatus = await this.vpnProfile.disconnect();
      await this.refreshStatus();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to disconnect VPN.';
    }
  }

  async openVpnSettings(): Promise<void> {
    await this.vpnStatus.openSettings();
    await this.refreshStatus();
  }

  async refreshStatus(): Promise<void> {
    this.status = await this.vpnStatus.getStatus();
  }

  async refreshProfileStatus(): Promise<void> {
    this.profileStatus = await this.vpnProfile.getStatus();
  }

  statusLabel(): string {
    return this.vpnStatus.statusLabel(this.status);
  }

  statusDetail(): string {
    return this.vpnStatus.statusDetail(this.status);
  }
}
