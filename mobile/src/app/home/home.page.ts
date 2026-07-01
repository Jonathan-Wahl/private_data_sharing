import { Component } from '@angular/core';

interface DashboardAction {
  detail: string;
  icon: string;
  route: string;
  title: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  readonly actions: DashboardAction[] = [
    {
      detail: 'Encrypt a message locally and create a QR/share code.',
      icon: 'chatbox-ellipses-outline',
      route: '/share-text',
      title: 'Share Text',
    },
    {
      detail: 'Encrypt a file before handing it to another device.',
      icon: 'document-attach-outline',
      route: '/share-file',
      title: 'Share File',
    },
    {
      detail: 'Paste a share code and decrypt on this device.',
      icon: 'download-outline',
      route: '/receive',
      title: 'Receive',
    },
    {
      detail: 'Check VPN status and inspect available provider servers.',
      icon: 'shield-checkmark-outline',
      route: '/vpn',
      title: 'VPN',
    },
    {
      detail: 'Review local-only queue and transfer history.',
      icon: 'time-outline',
      route: '/history',
      title: 'History',
    },
  ];
}
