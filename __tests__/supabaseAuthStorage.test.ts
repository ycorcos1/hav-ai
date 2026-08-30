const mockSQLiteStorageInstall = jest.fn();

jest.mock("expo-sqlite/localStorage/install", () => {
  mockSQLiteStorageInstall();
});

type AuthStorageModule = typeof import("@/lib/supabase/authStorage.shared");

function loadStorage(modulePath: string) {
  let storageModule: AuthStorageModule | undefined;

  jest.isolateModules(() => {
    storageModule = require(modulePath) as AuthStorageModule;
  });

  if (!storageModule) {
    throw new Error(`Unable to load auth storage module: ${modulePath}`);
  }

  return storageModule.authStorage;
}

describe("Supabase auth storage", () => {
  const localStorageMock = {
    getItem: jest.fn(() => "stored-session"),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
  });

  afterAll(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("installs and uses Expo SQLite-backed localStorage on native", () => {
    const storage = loadStorage("@/lib/supabase/authStorage.native");

    expect(mockSQLiteStorageInstall).toHaveBeenCalledTimes(1);
    expect(storage.getItem("session")).toBe("stored-session");
    storage.setItem("session", "value");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("session", "value");
    storage.removeItem("session");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("session");
  });

  it("uses browser localStorage on web without installing Expo SQLite", () => {
    const storage = loadStorage("@/lib/supabase/authStorage.web");

    expect(mockSQLiteStorageInstall).not.toHaveBeenCalled();
    expect(storage.getItem("session")).toBe("stored-session");
    storage.setItem("session", "value");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("session", "value");
    storage.removeItem("session");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("session");
  });
});
