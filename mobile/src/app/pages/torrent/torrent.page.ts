import { Component, OnDestroy, OnInit } from '@angular/core';

import { TorrentEngineStatus, TorrentJob, TorrentService } from '../../services/torrent';
import { VpnStatus, VpnStatusService } from '../../services/vpn-status';

@Component({
  selector: 'app-torrent',
  templateUrl: './torrent.page.html',
  styleUrls: ['./torrent.page.scss'],
  standalone: false,
})
export class TorrentPage implements OnDestroy, OnInit {
  engineStatus: TorrentEngineStatus = this.torrentService.engineStatus();
  error = '';
  jobs: TorrentJob[] = [];
  legalAcknowledgement = false;
  magnetUri = '';
  vpnRequired = false;
  vpnStatus: VpnStatus = {
    active: false,
    platform: 'unknown',
  };
  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly torrentService: TorrentService,
    private readonly vpnStatusService: VpnStatusService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.refreshVpnStatus();
    await this.refresh();
    this.refreshTimer = setInterval(() => {
      void this.refresh();
    }, 1500);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  async addMagnet(): Promise<void> {
    this.error = '';

    try {
      await this.torrentService.addMagnet(
        this.magnetUri.trim(),
        this.legalAcknowledgement,
        this.vpnRequired,
      );
      this.magnetUri = '';
      await this.refresh();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to add torrent.';
    }
  }

  async onTorrentFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) {
      return;
    }

    try {
      await this.torrentService.addTorrentFile(file, this.legalAcknowledgement, this.vpnRequired);
      await this.refresh();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to add torrent file.';
    }
  }

  async refresh(): Promise<void> {
    this.jobs = await this.torrentService.list();
  }

  async refreshVpnStatus(): Promise<void> {
    this.vpnStatus = await this.vpnStatusService.getStatus();
  }

  async openVpnSettings(): Promise<void> {
    await this.vpnStatusService.openSettings();
    await this.refreshVpnStatus();
  }

  async remove(job: TorrentJob): Promise<void> {
    this.jobs = await this.torrentService.remove(job.id);
  }

  async setStatus(job: TorrentJob, status: TorrentJob['status']): Promise<void> {
    this.error = '';
    await this.refreshVpnStatus();

    try {
      this.jobs = await this.torrentService.setStatus(job.id, status);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to update torrent.';
    }
  }

  vpnStatusLabel(): string {
    return this.vpnStatusService.statusLabel(this.vpnStatus);
  }
}
