export type AuthStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function getLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export const authStorage: AuthStorage = {
  getItem(key) {
    return getLocalStorage()?.getItem(key) ?? null;
  },
  setItem(key, value) {
    getLocalStorage()?.setItem(key, value);
  },
  removeItem(key) {
    getLocalStorage()?.removeItem(key);
  },
};
