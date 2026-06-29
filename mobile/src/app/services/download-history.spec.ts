import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it } from 'vitest';

import { DownloadHistoryService } from './download-history';
import { LocalStorageService } from './local-storage';

describe('DownloadHistoryService', () => {
  let service: DownloadHistoryService;

  beforeEach(async () => {
    await Preferences.clear();
    service = new DownloadHistoryService(new LocalStorageService());
  });

  it('keeps transfer records locally', async () => {
    await service.add({
      id: 'record-1',
      kind: 'text-share',
      name: 'Text',
      status: 'complete',
    });

    const records = await service.list();

    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Text');
  });
});
