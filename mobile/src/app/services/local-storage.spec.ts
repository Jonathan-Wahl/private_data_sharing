import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it } from 'vitest';

import { LocalStorageService } from './local-storage';

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(async () => {
    await Preferences.clear();
    service = new LocalStorageService();
  });

  it('stores and reads JSON values', async () => {
    await service.setJson('spec:value', { ready: true });

    await expect(service.getJson('spec:value', { ready: false })).resolves.toEqual({
      ready: true,
    });
  });

  it('clears values by namespace', async () => {
    await service.setJson('spec:first', 1);
    await service.setJson('other:first', 2);
    await service.clearNamespace('spec');

    await expect(service.getJson('spec:first', 0)).resolves.toBe(0);
    await expect(service.getJson('other:first', 0)).resolves.toBe(2);
  });
});
