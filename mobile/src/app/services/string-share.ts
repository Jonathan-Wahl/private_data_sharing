import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

import { CryptoService, PortableShareCode } from './crypto';

export interface PreparedStringShare {
  encrypted: PortableShareCode;
  qrDataUrl: string;
  shareCode: string;
}

@Injectable({
  providedIn: 'root',
})
export class StringShareService {
  constructor(private readonly cryptoService: CryptoService) {}

  async decrypt(shareCode: string): Promise<string> {
    const parsed = this.cryptoService.parseShareCode(shareCode);

    return this.cryptoService.decryptText(parsed.package, parsed.secret);
  }

  async prepare(text: string): Promise<PreparedStringShare> {
    const encrypted = await this.cryptoService.encryptText(text);
    const shareCode = this.cryptoService.serializeShareCode(encrypted);
    const qrDataUrl = await QRCode.toDataURL(shareCode, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
    });

    return { encrypted, qrDataUrl, shareCode };
  }
}
