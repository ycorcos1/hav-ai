import { SQLiteStorage } from "expo-sqlite/kv-store";
import type { RecoveryStorage } from "./recoveryBookmark";

export const RECOVERY_DATABASE_NAME = "havai-recovery.db";
const storage = new SQLiteStorage(RECOVERY_DATABASE_NAME);
export function createRecoveryStorage(): RecoveryStorage { return storage; }
