import { Component } from '@angular/core';

import { DownloadHistoryService } from '../../services/download-history';
import { PreparedStringShare, StringShareService } from '../../services/string-share';

@Component({
  selector: 'app-share-text',
  templateUrl: './share-text.page.html',
  styleUrls: ['./share-text.page.scss'],
  standalone: false,
})
export class ShareTextPage {
  error = '';
  isWorking = false;
  prepared?: PreparedStringShare;
  text = '';

  constructor(
    private readonly history: DownloadHistoryService,
    private readonly stringShare: StringShareService,
  ) {}

  async prepare(): Promise<void> {
    this.error = '';
    this.prepared = undefined;

    if (!this.text.trim()) {
      this.error = 'Enter text to encrypt.';
      return;
    }

    this.isWorking = true;

    try {
      this.prepared = await this.stringShare.prepare(this.text);
      await this.history.add({
        bytesTotal: new TextEncoder().encode(this.text).byteLength,
        id: crypto.randomUUID(),
        kind: 'text-share',
        name: 'Encrypted text share',
        status: 'complete',
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to encrypt text.';
    } finally {
      this.isWorking = false;
    }
  }
}
