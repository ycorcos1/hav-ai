import { browserWebPreviewStorage } from "@/db/webPreview/storage";
import type { RecoveryStorage } from "./recoveryBookmark";

export const recoveryPreviewPrefix = "havai:dev:recovery:";
export function createRecoveryStorage(): RecoveryStorage {
  return {
    getItem: async (key) => browserWebPreviewStorage().getItem(recoveryPreviewPrefix + key),
    setItem: async (key, value) => { browserWebPreviewStorage().setItem(recoveryPreviewPrefix + key, value); },
    removeItem: async (key) => { browserWebPreviewStorage().removeItem(recoveryPreviewPrefix + key); },
  };
}
