import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  async clearNamespace(namespace: string): Promise<void> {
    const { keys } = await Preferences.keys();
    const removals = keys
      .filter((key) => key.startsWith(`${namespace}:`))
      .map((key) => Preferences.remove({ key }));

    await Promise.all(removals);
  }

  async getJson<T>(key: string, fallback: T): Promise<T> {
    const { value } = await Preferences.get({ key });

    if (!value) {
      return fallback;
    }

    return JSON.parse(value) as T;
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  async setJson<T>(key: string, value: T): Promise<void> {
    await Preferences.set({ key, value: JSON.stringify(value) });
  }
}
