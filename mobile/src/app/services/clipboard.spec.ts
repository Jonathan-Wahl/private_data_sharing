import { Clipboard } from '@capacitor/clipboard';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClipboardService } from './clipboard';

describe('ClipboardService', () => {
  let service: ClipboardService;

  beforeEach(() => {
    service = new ClipboardService();
    vi.mocked(Clipboard.write).mockClear();
    vi.mocked(Clipboard.read).mockClear();
  });

  it('copies text with an Android-visible label', async () => {
    await service.copyText('secure-share://payload', 'Share code');

    expect(Clipboard.write).toHaveBeenCalledWith({
      label: 'Share code',
      string: 'secure-share://payload',
    });
  });

  it('pastes text from the system clipboard', async () => {
    vi.mocked(Clipboard.read).mockResolvedValueOnce({
      type: 'text/plain',
      value: 'clipboard payload',
    });

    await expect(service.pasteText()).resolves.toBe('clipboard payload');
  });
});
