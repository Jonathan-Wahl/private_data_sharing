import { Component } from '@angular/core';

import { DownloadHistoryService } from '../../services/download-history';
import { FileTransferService, PreparedFileShare } from '../../services/file-transfer';

@Component({
  selector: 'app-share-file',
  templateUrl: './share-file.page.html',
  styleUrls: ['./share-file.page.scss'],
  standalone: false,
})
export class ShareFilePage {
  error = '';
  isWorking = false;
  prepared?: PreparedFileShare;
  selectedFile?: File;

  constructor(
    private readonly fileTransfer: FileTransferService,
    private readonly history: DownloadHistoryService,
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0];
    this.prepared = undefined;
    this.error = '';
  }

  async prepare(): Promise<void> {
    if (!this.selectedFile) {
      this.error = 'Choose a file to encrypt.';
      return;
    }

    this.isWorking = true;
    this.error = '';

    try {
      this.prepared = await this.fileTransfer.prepare(this.selectedFile);
      await this.history.add({
        bytesTotal: this.selectedFile.size,
        id: crypto.randomUUID(),
        kind: 'file-share',
        name: this.selectedFile.name,
        status: 'complete',
      });
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to encrypt file.';
    } finally {
      this.isWorking = false;
    }
  }
}
