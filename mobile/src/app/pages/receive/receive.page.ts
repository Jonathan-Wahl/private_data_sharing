import { Component } from '@angular/core';

import { ClipboardService } from '../../services/clipboard';
import { CryptoService } from '../../services/crypto';
import { DownloadHistoryService } from '../../services/download-history';
import { FileTransferService } from '../../services/file-transfer';
import { StringShareService } from '../../services/string-share';
import { createUuid } from '../../services/uuid';

@Component({
  selector: 'app-receive',
  templateUrl: './receive.page.html',
  styleUrls: ['./receive.page.scss'],
  standalone: false,
})
export class ReceivePage {
  clipboardMessage = '';
  decryptedText = '';
  downloadUrl = '';
  error = '';
  fileName = '';
  isWorking = false;
  shareCode = '';

  constructor(
    private readonly clipboard: ClipboardService,
    private readonly cryptoService: CryptoService,
    private readonly fileTransfer: FileTransferService,
    private readonly history: DownloadHistoryService,
    private readonly stringShare: StringShareService,
  ) {}

  async copyDecryptedText(): Promise<void> {
    if (!this.decryptedText) {
      return;
    }

    await this.clipboard.copyText(this.decryptedText, 'Secure Share decrypted text');
    this.clipboardMessage = 'Decrypted text copied.';
  }

  async decrypt(): Promise<void> {
    this.clipboardMessage = '';
    this.error = '';
    this.decryptedText = '';
    this.downloadUrl = '';
    this.fileName = '';

    if (!this.shareCode.trim()) {
      this.error = 'Paste a share code to decrypt.';
      return;
    }

    this.isWorking = true;

    try {
      const parsed = this.cryptoService.parseShareCode(this.shareCode);

      if (parsed.package.kind === 'text') {
        this.decryptedText = await this.stringShare.decrypt(this.shareCode);
        await this.history.add({
          bytesReceived: parsed.package.size,
          id: createUuid(),
          kind: 'text-share',
          name: parsed.package.name || 'Received text',
          status: 'complete',
        });
      } else {
        const blob = await this.fileTransfer.decryptToBlob(this.shareCode);
        this.downloadUrl = URL.createObjectURL(blob);
        this.fileName = parsed.package.name || 'received-file';
        await this.history.add({
          bytesReceived: parsed.package.size,
          id: createUuid(),
          kind: 'file-share',
          name: this.fileName,
          status: 'complete',
        });
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to decrypt share code.';
    } finally {
      this.isWorking = false;
    }
  }

  async pasteShareCode(): Promise<void> {
    this.shareCode = await this.clipboard.pasteText();
    this.clipboardMessage = this.shareCode ? 'Share code pasted.' : 'Clipboard is empty.';
    this.error = '';
  }
}
