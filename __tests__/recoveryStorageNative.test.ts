import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const mockOpenDatabase = jest.fn();
// Run Expo's actual key-value implementation over a real, file-backed SQLite bridge.
jest.mock("expo-sqlite", () => ({ openDatabaseAsync: (name: string) => mockOpenDatabase(name) }));
import { SQLiteStorage } from "expo-sqlite/kv-store";
import { createRecoveryStorage, RECOVERY_DATABASE_NAME } from "@/features/workouts/services/recoveryStorage.native";
import { recoveryKey } from "@/features/workouts/services/recoveryBookmark";

it("uses the separate recovery database and survives Expo storage close/reopen", async () => {
  const directory = mkdtempSync(join(tmpdir(), "havai-bookmark-"));
  mockOpenDatabase.mockImplementation(async (name: string) => {
    const database = new NodeSQLiteConnection(new DatabaseSync(join(directory, name)));
    return Object.assign(database, {
      closeAsync: async () => database.close(),
      withTransactionAsync: async (task: () => Promise<void>) => database.withExclusiveTransactionAsync(task),
    });
  });
  const store = createRecoveryStorage();
  const reopened = new SQLiteStorage(RECOVERY_DATABASE_NAME);
  try {
    await store.setItem(recoveryKey("u", "w"), "instance-2");
    expect(store).toBeInstanceOf(SQLiteStorage);
    await (store as SQLiteStorage).closeAsync();
    expect(await reopened.getItem(recoveryKey("u", "w"))).toBe("instance-2");
    expect(mockOpenDatabase.mock.calls.map(([name]) => name)).toEqual(["havai-recovery.db", "havai-recovery.db"]);
    const inspection = new DatabaseSync(join(directory, RECOVERY_DATABASE_NAME));
    try {
      expect(inspection.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).toEqual([{ name: "storage" }]);
    } finally { inspection.close(); }
  } finally {
    await (store as SQLiteStorage).closeAsync();
    await reopened.closeAsync();
    rmSync(directory, { recursive: true, force: true });
  }
});
