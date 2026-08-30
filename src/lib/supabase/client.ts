import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";

import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { environment } from "@/lib/environment";

const sqliteLocalStorageAdapter = {
  getItem(key: string) {
    return globalThis.localStorage?.getItem(key) ?? null;
  },
  setItem(key: string, value: string) {
    globalThis.localStorage?.setItem(key, value);
  },
  removeItem(key: string) {
    globalThis.localStorage?.removeItem(key);
  },
};

export const supabase = createClient(
  environment.supabaseUrl,
  environment.supabasePublishableKey,
  {
    auth: {
      storage: sqliteLocalStorageAdapter,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
