import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { environment } from "@/lib/environment";
import { authStorage } from "@/lib/supabase/authStorage";
import type { Database } from "@/lib/supabase/database.types";

export const supabase = createClient<Database>(
  environment.supabaseUrl,
  environment.supabasePublishableKey,
  {
    auth: {
      storage: authStorage,
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
