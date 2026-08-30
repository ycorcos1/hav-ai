import { AppState } from "react-native";

const mockStartAutoRefresh = jest.fn();
const mockStopAutoRefresh = jest.fn();
const mockAddEventListener = jest.fn();
type ClientOptions = {
  auth: {
    storage: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
    };
    persistSession: boolean;
    autoRefreshToken: boolean;
    detectSessionInUrl: boolean;
  };
};

const mockCreateClient = jest.fn((_url: string, _key: string, _options: ClientOptions) => ({
  auth: {
    startAutoRefresh: mockStartAutoRefresh,
    stopAutoRefresh: mockStopAutoRefresh,
  },
}));

jest.mock("react-native-url-polyfill/auto", () => ({}));
jest.mock("expo-sqlite/localStorage/install", () => ({}));
jest.mock("@supabase/supabase-js", () => ({ createClient: mockCreateClient }));
jest.mock("@/lib/environment", () => ({
  environment: {
    appEnvironment: "development",
    supabaseUrl: "https://development-project.supabase.co",
    supabasePublishableKey: "test-publishable-key",
  },
}));

jest.spyOn(AppState, "addEventListener").mockImplementation(mockAddEventListener);

describe("Supabase client", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
    });
  });

  afterAll(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("creates one shared client from validated public configuration", () => {
    const firstImport = require("@/lib/supabase/client");
    const secondImport = require("@/lib/supabase/client");

    expect(firstImport.supabase).toBe(secondImport.supabase);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://development-project.supabase.co",
      "test-publishable-key",
      {
        auth: {
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function),
          }),
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    );

    const storage = mockCreateClient.mock.calls[0][2]?.auth?.storage;
    storage?.setItem("session", "value");
    expect(globalThis.localStorage.setItem).toHaveBeenCalledWith("session", "value");
    storage?.removeItem("session");
    expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith("session");
    storage?.getItem("session");
    expect(globalThis.localStorage.getItem).toHaveBeenCalledWith("session");
  });

  it("starts and stops token refresh with native app state", () => {
    require("@/lib/supabase/client");
    const listener = mockAddEventListener.mock.calls[0][1];

    listener("active");
    expect(mockStartAutoRefresh).toHaveBeenCalledTimes(1);

    listener("background");
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(1);
  });
});
