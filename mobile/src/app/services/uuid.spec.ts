import { afterEach, describe, expect, it, vi } from 'vitest';

import { createUuid } from './uuid';

describe('createUuid', () => {
  const originalRandomUUID = crypto.randomUUID;
  const originalGetRandomValues = crypto.getRandomValues.bind(crypto);

  afterEach(() => {
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: originalRandomUUID,
    });
    Object.defineProperty(crypto, 'getRandomValues', {
      configurable: true,
      value: originalGetRandomValues,
    });
    vi.restoreAllMocks();
  });

  it('uses native randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'native-id');

    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: randomUUID,
    });

    expect(createUuid()).toBe('native-id');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('falls back to a crypto-random v4 UUID', () => {
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(crypto, 'getRandomValues', {
      configurable: true,
      value: (bytes: Uint8Array) => {
        bytes.set([
          0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee,
          0xff,
        ]);

        return bytes;
      },
    });

    expect(createUuid()).toBe('00112233-4455-4677-8899-aabbccddeeff');
  });
});
