import { Component } from '@angular/core';

import { CryptoService } from '../../services/crypto';
import { DownloadHistoryService } from '../../services/download-history';
import { FileTransferService } from '../../services/file-transfer';
import { StringShareService } from '../../services/string-share';

@Component({
  selector: 'app-receive',
  templateUrl: './receive.page.html',
  styleUrls: ['./receive.page.scss'],
  standalone: false,
})
export class ReceivePage {
  decryptedText = '';
  downloadUrl = '';
  error = '';
  fileName = '';
  isWorking = false;
  shareCode = '';

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly fileTransfer: FileTransferService,
    private readonly history: DownloadHistoryService,
    private readonly stringShare: StringShareService,
  ) {}

  async decrypt(): Promise<void> {
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
          id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
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
}
