import { Component } from '@angular/core';

import { ClipboardService } from '../../services/clipboard';
import { DownloadHistoryService } from '../../services/download-history';
import { PreparedStringShare, StringShareService } from '../../services/string-share';
import { createUuid } from '../../services/uuid';

@Component({
  selector: 'app-share-text',
  templateUrl: './share-text.page.html',
  styleUrls: ['./share-text.page.scss'],
  standalone: false,
})
export class ShareTextPage {
  clipboardMessage = '';
  error = '';
  isWorking = false;
  prepared?: PreparedStringShare;
  text = '';

  constructor(
    private readonly clipboard: ClipboardService,
    private readonly history: DownloadHistoryService,
    private readonly stringShare: StringShareService,
  ) {}

  async copyShareCode(): Promise<void> {
    if (!this.prepared) {
      return;
    }

    await this.clipboard.copyText(this.prepared.shareCode, 'Secure Share code');
    this.clipboardMessage = 'Share code copied.';
  }

  async prepare(): Promise<void> {
    this.clipboardMessage = '';
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
        id: createUuid(),
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
