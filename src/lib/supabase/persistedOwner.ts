import { z } from "zod";

import type { AuthStorage } from "./authStorage.shared";

const storedSessionSchema = z.object({
  user: z.object({ id: z.uuid() }),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().finite().positive(),
});

export type PersistedOwner = { userId: string; isCurrent: () => boolean };

// This is Supabase's existing default storage key, not another auth store.
export function sessionStorageKey(url: string): string {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

export function readPersistedOwner(storage: AuthStorage, key: string): PersistedOwner | null {
  const serialized = storage.getItem(key);
  if (!serialized) return null;
  try {
    const parsed = storedSessionSchema.safeParse(JSON.parse(serialized));
    if (!parsed.success) return null;
    return {
      userId: parsed.data.user.id,
      // Recheck after every asynchronous boundary; do not expose credentials.
      isCurrent: () => storage.getItem(key) === serialized,
    };
  } catch { return null; }
}
