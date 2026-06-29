import { describe, expect, it } from 'vitest';

import { CryptoService } from './crypto';
import { FileTransferService } from './file-transfer';

describe('FileTransferService', () => {
  it('should be created', () => {
    expect(new FileTransferService(new CryptoService())).toBeTruthy();
  });
});
