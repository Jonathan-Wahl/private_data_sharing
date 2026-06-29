import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

import { CryptoService, PortableShareCode } from './crypto';

export interface PreparedFileShare {
  encrypted: PortableShareCode;
  qrDataUrl: string;
  shareCode: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileTransferService {
  constructor(private readonly cryptoService: CryptoService) {}

  async decryptToBlob(shareCode: string): Promise<Blob> {
    const parsed = this.cryptoService.parseShareCode(shareCode);
    const bytes = await this.cryptoService.decryptBytes(parsed.package, parsed.secret);

    return new Blob([bytes.buffer.slice(0) as ArrayBuffer], {
      type: parsed.package.mimeType || 'application/octet-stream',
    });
  }

  async prepare(file: File): Promise<PreparedFileShare> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const encrypted = await this.cryptoService.encryptBytes(bytes, 'file', {
      mimeType: file.type || 'application/octet-stream',
      name: file.name,
    });
    const shareCode = this.cryptoService.serializeShareCode(encrypted);
    const qrDataUrl = await QRCode.toDataURL(shareCode, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
    });

    return { encrypted, qrDataUrl, shareCode };
  }
}
