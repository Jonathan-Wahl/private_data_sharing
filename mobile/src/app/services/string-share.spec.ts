import { describe, expect, it } from 'vitest';

import { CryptoService } from './crypto';
import { StringShareService } from './string-share';

describe('StringShareService', () => {
  it('should be created', () => {
    expect(new StringShareService(new CryptoService())).toBeTruthy();
  });
});
