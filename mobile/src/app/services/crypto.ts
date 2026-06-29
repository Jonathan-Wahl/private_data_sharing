import { Injectable } from '@angular/core';

export type SharePayloadKind = 'text' | 'file';

export interface EncryptedSharePackage {
  algorithm: 'AES-GCM';
  ciphertext: string;
  createdAt: string;
  iv: string;
  kind: SharePayloadKind;
  mimeType?: string;
  name?: string;
  size: number;
  version: 1;
}

export interface ShareSecret {
  algorithm: 'AES-GCM';
  key: string;
  version: 1;
}

export interface PortableShareCode {
  package: EncryptedSharePackage;
  secret: ShareSecret;
}

@Injectable({
  providedIn: 'root',
})
export class CryptoService {
  private readonly algorithm = 'AES-GCM';
  private readonly decoder = new TextDecoder();
  private readonly encoder = new TextEncoder();

  async decryptBytes(
    encryptedPackage: EncryptedSharePackage,
    secret: ShareSecret,
  ): Promise<Uint8Array> {
    this.assertCompatible(encryptedPackage, secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.toArrayBuffer(this.fromBase64Url(secret.key)),
      { name: this.algorithm },
      false,
      ['decrypt'],
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: this.algorithm, iv: this.toArrayBuffer(this.fromBase64Url(encryptedPackage.iv)) },
      cryptoKey,
      this.toArrayBuffer(this.fromBase64Url(encryptedPackage.ciphertext)),
    );

    return new Uint8Array(plaintext);
  }

  async decryptText(encryptedPackage: EncryptedSharePackage, secret: ShareSecret): Promise<string> {
    if (encryptedPackage.kind !== 'text') {
      throw new Error('Share package does not contain text.');
    }

    return this.decoder.decode(await this.decryptBytes(encryptedPackage, secret));
  }

  async encryptBytes(
    bytes: Uint8Array,
    kind: SharePayloadKind,
    metadata: Pick<EncryptedSharePackage, 'mimeType' | 'name'> = {},
  ): Promise<PortableShareCode> {
    const rawKey = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.toArrayBuffer(rawKey),
      { name: this.algorithm },
      false,
      ['encrypt'],
    );
    const ciphertext = await crypto.subtle.encrypt(
      { name: this.algorithm, iv: this.toArrayBuffer(iv) },
      cryptoKey,
      this.toArrayBuffer(bytes),
    );

    return {
      package: {
        algorithm: this.algorithm,
        ciphertext: this.toBase64Url(new Uint8Array(ciphertext)),
        createdAt: new Date().toISOString(),
        iv: this.toBase64Url(iv),
        kind,
        mimeType: metadata.mimeType,
        name: metadata.name,
        size: bytes.byteLength,
        version: 1,
      },
      secret: {
        algorithm: this.algorithm,
        key: this.toBase64Url(rawKey),
        version: 1,
      },
    };
  }

  async encryptText(text: string): Promise<PortableShareCode> {
    return this.encryptBytes(this.encoder.encode(text), 'text', {
      mimeType: 'text/plain;charset=utf-8',
      name: 'shared-text.txt',
    });
  }

  parseShareCode(value: string): PortableShareCode {
    const parsed = JSON.parse(value) as PortableShareCode;

    if (!parsed.package || !parsed.secret) {
      throw new Error('Share code is missing encrypted package or secret.');
    }

    this.assertCompatible(parsed.package, parsed.secret);

    return parsed;
  }

  serializeShareCode(value: PortableShareCode): string {
    return JSON.stringify(value);
  }

  toBase64Url(bytes: Uint8Array): string {
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
  }

  private assertCompatible(encryptedPackage: EncryptedSharePackage, secret: ShareSecret): void {
    if (
      encryptedPackage.algorithm !== this.algorithm ||
      secret.algorithm !== this.algorithm ||
      encryptedPackage.version !== 1 ||
      secret.version !== 1
    ) {
      throw new Error('Unsupported share package format.');
    }
  }

  private fromBase64Url(value: string): Uint8Array {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const binary = atob(padded);

    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
}
