export function installLocalStorage(): void {
  const entries = new Map<string, string>();
  const storage = {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key: string) => {
      entries.delete(key);
    },
    setItem: (key: string, value: string) => {
      entries.set(key, String(value));
    },
  } satisfies Storage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}
