import { vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    clear: vi.fn(async () => {
      store.clear();
    }),
    get: vi.fn(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null })),
    keys: vi.fn(async () => ({ keys: Array.from(store.keys()) })),
    remove: vi.fn(async ({ key }: { key: string }) => {
      store.delete(key);
    }),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      store.set(key, value);
    }),
  },
}));

vi.mock('@capacitor/clipboard', () => ({
  Clipboard: {
    read: vi.fn(async () => ({ type: 'text/plain', value: '' })),
    write: vi.fn(async () => undefined),
  },
}));
