import { describe, expect, it } from 'vitest';

import { CryptoService } from './crypto';

describe('CryptoService', () => {
  it('encrypts and decrypts text with a per-share secret', async () => {
    const service = new CryptoService();
    const encrypted = await service.encryptText('private hello');
    const decrypted = await service.decryptText(encrypted.package, encrypted.secret);

    expect(decrypted).toBe('private hello');
    expect(encrypted.package.ciphertext).not.toContain('private hello');
    expect(encrypted.secret.key).toBeTruthy();
  });

  it('rejects a mismatched key', async () => {
    const service = new CryptoService();
    const first = await service.encryptText('one');
    const second = await service.encryptText('two');

    await expect(service.decryptText(first.package, second.secret)).rejects.toThrow();
  });
});
