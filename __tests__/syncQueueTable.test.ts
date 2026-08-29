import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, getLocalSchemaVersion } from "@/db";
import type { SyncEntityType } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const timestamp = "2026-08-29T12:00:00.000Z";
const entityTypes = [
  "workout_template",
  "workout_template_exercise",
  "custom_exercise",
  "workout",
  "workout_exercise",
  "set",
  "user_exercise_preference",
  "progression_recommendation",
] as const satisfies readonly SyncEntityType[];

describe("sync queue table migration", () => {
  it("persists every approved entity and retry metadata across reopen", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-sync-queue-"));
    const filename = join(directory, "sync.db");

    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await configureLocalDatabase(database);
      await expect(getLocalSchemaVersion(database)).resolves.toBe(5);

      for (const [index, entityType] of entityTypes.entries()) {
        await database.runAsync(
          `INSERT INTO sync_queue (
            id, entity_type, entity_id, operation, attempt_count,
            last_error, last_attempt_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          `queue-${index}`,
          entityType,
          `entity-${index}`,
          index % 2 === 0 ? "upsert" : "delete",
          index,
          index === 7 ? "Temporary failure" : null,
          index === 7 ? timestamp : null,
          timestamp,
        );
      }
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));

      try {
        await configureLocalDatabase(reopened);
        await expect(
          reopened.getFirstAsync<{ count: number; entity_types: string }>(
            `SELECT COUNT(*) AS count,
                    GROUP_CONCAT(entity_type, ',') AS entity_types
             FROM (SELECT entity_type FROM sync_queue ORDER BY id);`,
          ),
        ).resolves.toEqual({ count: 8, entity_types: entityTypes.join(",") });
        await expect(
          reopened.getFirstAsync<{
            attempt_count: number;
            last_error: string;
            last_attempt_at: string;
          }>(
            "SELECT attempt_count, last_error, last_attempt_at FROM sync_queue WHERE id = ?;",
            "queue-7",
          ),
        ).resolves.toEqual({
          attempt_count: 7,
          last_error: "Temporary failure",
          last_attempt_at: timestamp,
        });
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects personal records, invalid operations, and duplicate logical entries", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    const insertSql = `
      INSERT INTO sync_queue (id, entity_type, entity_id, operation, created_at)
      VALUES (?, ?, ?, ?, ?);
    `;

    try {
      await configureLocalDatabase(database);
      await expect(
        database.runAsync(
          insertSql,
          "personal-record-item",
          "personal_record",
          "record-1",
          "upsert",
          timestamp,
        ),
      ).rejects.toThrow();
      await expect(
        database.runAsync(
          insertSql,
          "invalid-operation-item",
          "set",
          "set-1",
          "create",
          timestamp,
        ),
      ).rejects.toThrow();

      await database.runAsync(
        insertSql,
        "queue-1",
        "set",
        "set-1",
        "upsert",
        timestamp,
      );
      await expect(
        database.runAsync(
          insertSql,
          "queue-2",
          "set",
          "set-1",
          "delete",
          timestamp,
        ),
      ).rejects.toThrow();
      await expect(
        database.getFirstAsync<{ attempt_count: number; last_error: null }>(
          "SELECT attempt_count, last_error FROM sync_queue WHERE id = ?;",
          "queue-1",
        ),
      ).resolves.toEqual({ attempt_count: 0, last_error: null });
    } finally {
      database.close();
    }
  });
});
