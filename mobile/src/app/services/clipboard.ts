import { Injectable } from '@angular/core';
import { Clipboard } from '@capacitor/clipboard';

@Injectable({
  providedIn: 'root',
})
export class ClipboardService {
  async copyText(text: string, label: string): Promise<void> {
    await Clipboard.write({ label, string: text });
  }

  async pasteText(): Promise<string> {
    const result = await Clipboard.read();

    return result.value;
  }
}
