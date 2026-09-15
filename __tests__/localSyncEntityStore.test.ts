import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, SQLiteLocalSyncEntityStore } from "@/db";
import type { SyncQueueItem } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "user-a";
const timestamp = "2026-09-15T19:00:00.000Z";

describe("SQLiteLocalSyncEntityStore", () => {
  it("loads the latest owner-scoped entity immediately before upload", async () => {
    const database = await databaseWithWorkout();
    try {
      await database.runAsync(
        "UPDATE local_workouts SET name = ?, updated_at = ? WHERE id = ?;",
        "Latest local name",
        "2026-09-15T19:01:00.000Z",
        "workout-a",
      );
      const store = new SQLiteLocalSyncEntityStore(database, userId);

      await expect(store.loadLatest(queueItem("upsert"))).resolves.toEqual(
        expect.objectContaining({
          entityType: "workout",
          operation: "upsert",
          entity: expect.objectContaining({
            id: "workout-a",
            name: "Latest local name",
            updatedAt: "2026-09-15T19:01:00.000Z",
          }),
        }),
      );
      await expect(new SQLiteLocalSyncEntityStore(database, "user-b")
        .loadLatest(queueItem("upsert"))).resolves.toBeNull();
    } finally {
      database.close();
    }
  });

  it("stores server confirmation only when the uploaded entity is still current", async () => {
    const database = await databaseWithWorkout();
    try {
      const store = new SQLiteLocalSyncEntityStore(database, userId);
      const mutation = await store.loadLatest(queueItem("upsert"));
      if (!mutation || mutation.operation !== "upsert") throw new Error("Expected workout mutation.");

      await expect(store.confirmUpsert(
        queueItem("upsert"),
        mutation,
        { serverUpdatedAt: "2026-09-15T19:02:00.000Z" },
      )).resolves.toBe(true);
      await expect(database.getFirstAsync(
        "SELECT sync_status, server_updated_at FROM local_workouts WHERE id = ?;",
        "workout-a",
      )).resolves.toEqual({
        sync_status: "synced",
        server_updated_at: "2026-09-15T19:02:00.000Z",
      });

      await database.runAsync(
        "UPDATE local_workouts SET name = ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?;",
        "Changed during upload",
        "2026-09-15T19:03:00.000Z",
        "workout-a",
      );
      await expect(store.confirmUpsert(
        queueItem("upsert"),
        mutation,
        { serverUpdatedAt: "2026-09-15T19:04:00.000Z" },
      )).resolves.toBe(false);
      await expect(database.getFirstAsync(
        "SELECT name, sync_status, updated_at FROM local_workouts WHERE id = ?;",
        "workout-a",
      )).resolves.toEqual({
        name: "Changed during upload",
        sync_status: "pending_update",
        updated_at: "2026-09-15T19:03:00.000Z",
      });
    } finally {
      database.close();
    }
  });

  it("cleans confirmed tombstones without deleting a concurrently revived row", async () => {
    const database = await databaseWithWorkout();
    try {
      await seedSet(database, "set-delete", "pending_delete", timestamp);
      const store = new SQLiteLocalSyncEntityStore(database, userId);
      const deletion = { ...queueItem("delete"), entityType: "set" as const, entityId: "set-delete" };

      await expect(store.confirmDelete(deletion)).resolves.toBe(true);
      await expect(database.getFirstAsync(
        "SELECT id FROM local_sets WHERE id = ?;", "set-delete",
      )).resolves.toBeNull();
      await expect(store.confirmDelete(deletion)).resolves.toBe(true);

      await seedSet(database, "set-revived", "pending_update", null);
      await expect(store.confirmDelete({ ...deletion, entityId: "set-revived" }))
        .resolves.toBe(false);
      await expect(database.getFirstAsync(
        "SELECT id FROM local_sets WHERE id = ?;", "set-revived",
      )).resolves.toEqual({ id: "set-revived" });
    } finally {
      database.close();
    }
  });
});

async function databaseWithWorkout(): Promise<NodeSQLiteConnection> {
  const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
  await configureLocalDatabase(database);
  await database.execAsync(`
    INSERT INTO local_workouts
      (id, user_id, name, status, started_at, completed_at, sync_status, created_at, updated_at)
    VALUES ('workout-a', '${userId}', 'Original', 'completed', '${timestamp}', '${timestamp}',
            'pending_create', '${timestamp}', '${timestamp}');
    INSERT INTO local_workout_exercises
      (id, user_id, workout_id, exercise_id, position, sync_status, created_at, updated_at)
    VALUES ('workout-exercise-a', '${userId}', 'workout-a', 'exercise-a', 0,
            'pending_create', '${timestamp}', '${timestamp}');
  `);
  return database;
}

async function seedSet(
  database: NodeSQLiteConnection,
  id: string,
  syncStatus: "pending_delete" | "pending_update",
  deletedAt: string | null,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO local_sets
      (id, user_id, workout_id, workout_exercise_id, exercise_id, position, set_type,
       reps, completed_at, sync_status, deleted_at, created_at, updated_at)
     VALUES (?, ?, 'workout-a', 'workout-exercise-a', 'exercise-a',
       (SELECT COUNT(*) FROM local_sets), 'working', 8, ?, ?, ?, ?, ?);`,
    id,
    userId,
    timestamp,
    syncStatus,
    deletedAt,
    timestamp,
    timestamp,
  );
}

function queueItem(operation: SyncQueueItem["operation"]): SyncQueueItem {
  return {
    id: "queue-workout",
    entityType: "workout",
    entityId: "workout-a",
    operation,
    attemptCount: 0,
    createdAt: timestamp,
  };
}
