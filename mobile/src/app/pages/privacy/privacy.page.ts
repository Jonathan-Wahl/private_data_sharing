import { Component } from '@angular/core';

interface PrivacyPoint {
  detail: string;
  title: string;
}

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss'],
  standalone: false,
})
export class PrivacyPage {
  readonly points: PrivacyPoint[] = [
    {
      title: 'Encryption boundary',
      detail:
        'Text and files are encrypted with per-share AES-GCM keys before a QR code, share code, or peer transfer is produced.',
    },
    {
      title: 'Coordination boundary',
      detail:
        'Signaling rooms are short-lived and store only connection metadata or encrypted metadata. Payloads and raw keys do not belong on the API.',
    },
    {
      title: 'Local state',
      detail:
        'History and torrent queue entries are stored on this device through Capacitor Preferences.',
    },
    {
      title: 'Torrent limitation',
      detail:
        'Torrent downloads run locally through the app runtime. Browser and mobile WebView downloads depend on WebRTC-capable swarms and trackers.',
    },
  ];
}
