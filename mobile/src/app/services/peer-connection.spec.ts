import { describe, expect, it } from 'vitest';

import { PeerConnectionService } from './peer-connection';

describe('PeerConnectionService', () => {
  it('should be created', () => {
    expect(new PeerConnectionService()).toBeTruthy();
  });
});
