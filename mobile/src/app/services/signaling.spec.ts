import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';

import { LocalStorageService } from './local-storage';
import { SignalingService } from './signaling';

describe('SignalingService', () => {
  let service: SignalingService;

  beforeEach(async () => {
    await Preferences.clear();
    environment.signalingApiBaseUrl = '';
    service = new SignalingService(new LocalStorageService());
  });

  it('creates short-lived rooms and appends signaling messages', async () => {
    const room = await service.createRoom();
    const updated = await service.appendMessage(room.id, {
      body: { sdp: 'encrypted-or-connection-metadata' },
      senderId: 'sender',
      type: 'offer',
    });

    expect(updated.messages).toHaveLength(1);
    expect(new Date(updated.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('does not expose missing rooms', async () => {
    await expect(service.getRoom('missing')).resolves.toBeNull();
  });
});
