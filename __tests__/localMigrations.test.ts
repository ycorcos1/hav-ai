import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  ensureSchemaMetadataTable,
  getLocalSchemaVersion,
  runLocalMigrations,
  type LocalMigration,
} from "@/db";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

function createConnection(filename: string = ":memory:") {
  return new NodeSQLiteConnection(new DatabaseSync(filename));
}

describe("local migration runner", () => {
  it("applies the production registry through version four without future tables", async () => {
    const database = createConnection();

    try {
      await configureLocalDatabase(database);

      await expect(getLocalSchemaVersion(database)).resolves.toBe(4);
      await expect(
        database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM sqlite_master
           WHERE type = 'table'
             AND name IN (
               'local_schema_metadata',
               'local_workouts',
               'local_workout_exercises',
               'local_sets',
               'local_workout_templates',
               'local_workout_template_exercises',
               'local_progression_recommendations',
               'sync_queue'
             );`,
        ),
      ).resolves.toEqual(expect.objectContaining({ count: 8 }));
      await expect(
        database.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) AS count FROM sqlite_master
           WHERE type = 'table'
             AND name IN (
               'cached_exercises',
               'cached_recent_exercise_sessions',
               'local_exercises',
               'local_user_exercise_preferences'
             );`,
        ),
      ).resolves.toEqual(expect.objectContaining({ count: 0 }));
    } finally {
      database.close();
    }
  });

  it("executes migrations in version order and only once", async () => {
    const database = createConnection();
    const executionOrder: number[] = [];
    const migrations: LocalMigration[] = [
      {
        version: 2,
        name: "record_second_step",
        async migrate(transaction) {
          executionOrder.push(2);
          await transaction.runAsync("INSERT INTO migration_probe (step) VALUES (?);", 2);
        },
      },
      {
        version: 1,
        name: "create_probe",
        async migrate(transaction) {
          executionOrder.push(1);
          await transaction.execAsync(
            "CREATE TABLE migration_probe (step INTEGER NOT NULL UNIQUE);",
          );
          await transaction.runAsync("INSERT INTO migration_probe (step) VALUES (?);", 1);
        },
      },
    ];

    try {
      await ensureSchemaMetadataTable(database);
      await expect(runLocalMigrations(database, migrations)).resolves.toBe(2);
      await expect(runLocalMigrations(database, migrations)).resolves.toBe(2);

      expect(executionOrder).toEqual([1, 2]);
      await expect(
        database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM migration_probe;"),
      ).resolves.toEqual(expect.objectContaining({ count: 2 }));
    } finally {
      database.close();
    }
  });

  it("preserves schema version across a real database reopen", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-migrations-"));
    const filename = join(directory, "reopen.db");
    const migration: LocalMigration = {
      version: 1,
      name: "create_reopen_probe",
      async migrate(transaction) {
        await transaction.execAsync("CREATE TABLE reopen_probe (value TEXT NOT NULL);");
        await transaction.runAsync("INSERT INTO reopen_probe (value) VALUES (?);", "preserved");
      },
    };

    try {
      const firstConnection = createConnection(filename);
      await ensureSchemaMetadataTable(firstConnection);
      await runLocalMigrations(firstConnection, [migration]);
      firstConnection.close();

      const reopenedConnection = createConnection(filename);

      try {
        await ensureSchemaMetadataTable(reopenedConnection);
        await expect(runLocalMigrations(reopenedConnection, [migration])).resolves.toBe(1);
        await expect(getLocalSchemaVersion(reopenedConnection)).resolves.toBe(1);
        await expect(
          reopenedConnection.getFirstAsync<{ value: string }>("SELECT value FROM reopen_probe;"),
        ).resolves.toEqual(expect.objectContaining({ value: "preserved" }));
      } finally {
        reopenedConnection.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rolls back failed migrations without advancing version or damaging the database", async () => {
    const database = createConnection();
    const migrations: LocalMigration[] = [
      {
        version: 1,
        name: "create_preserved_table",
        async migrate(transaction) {
          await transaction.execAsync("CREATE TABLE preserved_data (value TEXT NOT NULL);");
          await transaction.runAsync("INSERT INTO preserved_data (value) VALUES (?);", "safe");
        },
      },
      {
        version: 2,
        name: "fail_after_write",
        async migrate(transaction) {
          await transaction.execAsync("CREATE TABLE failed_artifact (value TEXT NOT NULL);");
          await transaction.runAsync("INSERT INTO failed_artifact (value) VALUES (?);", "unsafe");
          throw new Error("intentional migration failure");
        },
      },
    ];

    try {
      await ensureSchemaMetadataTable(database);
      await expect(runLocalMigrations(database, migrations)).rejects.toThrow(
        "intentional migration failure",
      );
      await expect(getLocalSchemaVersion(database)).resolves.toBe(1);
      await expect(
        database.getFirstAsync<{ value: string }>("SELECT value FROM preserved_data;"),
      ).resolves.toEqual(expect.objectContaining({ value: "safe" }));
      await expect(
        database.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'failed_artifact';",
        ),
      ).resolves.toEqual(expect.objectContaining({ count: 0 }));
      await expect(database.getFirstAsync<{ value: number }>("SELECT 1 AS value;")).resolves.toEqual(
        expect.objectContaining({ value: 1 }),
      );
    } finally {
      database.close();
    }
  });
});
