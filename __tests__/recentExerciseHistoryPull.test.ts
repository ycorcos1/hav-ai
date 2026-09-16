import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteExerciseHistoryRepository,
  SQLiteRecentExerciseSessionCacheRepository,
} from "@/db";
import type { CachedRecentExerciseSession } from "@/db/repositories";
import {
  RecentExerciseHistoryPullService,
  recentSessionLimit,
} from "@/features/sync/services";
import type { RemoteExerciseHistoryRepository } from "@/lib/supabase/repositories";
import type { SyncResult } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const userId = "a0000000-0000-4000-8000-00000000000a";
const otherUserId = "b0000000-0000-4000-8000-00000000000b";
const exerciseId = "10000000-0000-4000-8000-000000000001";
const otherExerciseId = "10000000-0000-4000-8000-000000000002";

describe("recent exercise history cache pull", () => {
  it("pushes first and atomically caches only the five newest sessions per exercise", async () => {
    const database = await openDatabase();
    try {
      const events: string[] = [];
      const sessions = [
        ...Array.from({ length: 6 }, (_, index) => session(index)),
        session(0, otherExerciseId),
      ];
      const service = new RecentExerciseHistoryPullService(
        userId,
        { synchronize: async () => {
          events.push("push");
          return successfulSyncResult;
        } },
        { fetchOwnCompletedSessions: async () => {
          events.push("pull");
          return sessions;
        } },
        new SQLiteRecentExerciseSessionCacheRepository(database),
      );

      await expect(service.pullRecentHistory()).resolves.toEqual({ sessionsCached: 6 });
      expect(events).toEqual(["push", "pull"]);
      await expect(database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM cached_recent_exercise_sessions WHERE user_id=? AND exercise_id=?;",
        userId,
        exerciseId,
      )).resolves.toEqual({ count: recentSessionLimit });
      await expect(database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sync_queue;",
      )).resolves.toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });

  it("merges replaceable cache history while canonical local workouts win duplicates", async () => {
    const database = await openDatabase();
    try {
      await seedCompletedLocalSession(database);
      await new SQLiteRecentExerciseSessionCacheRepository(database).replaceForUser(userId, [
        {
          ...session(0),
          id: "cache-duplicate",
          workoutId: "local-workout",
          workingSets: [{ weightKg: 999, reps: 1 }],
        },
        session(1),
        {
          ...session(1),
          id: "cache-second-instance",
          workingSets: [{ weightKg: 82, reps: 7 }],
        },
      ], recentSessionLimit);

      const recent = await new SQLiteExerciseHistoryRepository(database).getRecentSessions({
        userId,
        exerciseId,
        limit: 5,
      });
      expect(recent).toEqual(expect.arrayContaining([
        expect.objectContaining({
          workoutId: "local-workout",
          sets: [{ weightKg: 80, reps: 8, rpe: 8 }],
        }),
        expect.objectContaining({ workoutId: "workout-1" }),
      ]));
      expect(recent.find(({ workoutId }) => workoutId === "local-workout")?.sets)
        .not.toContainEqual({ weightKg: 999, reps: 1 });
      expect(recent.find(({ workoutId }) => workoutId === "workout-1")?.sets).toEqual([
        { weightKg: 81, reps: 8, rpe: 8 },
        { weightKg: 82, reps: 7 },
      ]);
    } finally {
      database.close();
    }
  });

  it("rejects foreign cache rows before replacement and preserves existing cache", async () => {
    const database = await openDatabase();
    try {
      const cache = new SQLiteRecentExerciseSessionCacheRepository(database);
      await cache.replaceForUser(userId, [session(0)], recentSessionLimit);
      await expect(cache.replaceForUser(userId, [{
        ...session(1),
        userId: otherUserId,
      }], recentSessionLimit)).rejects.toThrow("not accessible");
      await expect(database.getFirstAsync<{ id: string }>(
        "SELECT id FROM cached_recent_exercise_sessions WHERE user_id=?;",
        userId,
      )).resolves.toEqual({ id: "cache-0" });
    } finally {
      database.close();
    }
  });

  it("does not replace a valid cache when push or remote fetch fails", async () => {
    const database = await openDatabase();
    try {
      const cache = new SQLiteRecentExerciseSessionCacheRepository(database);
      await cache.replaceForUser(userId, [session(0)], recentSessionLimit);
      const remote: RemoteExerciseHistoryRepository = {
        fetchOwnCompletedSessions: async () => { throw new Error("offline"); },
      };
      const service = new RecentExerciseHistoryPullService(
        userId,
        { synchronize: async () => successfulSyncResult },
        remote,
        cache,
      );
      await expect(service.pullRecentHistory()).rejects.toThrow("offline");
      await expect(database.getFirstAsync<{ id: string }>(
        "SELECT id FROM cached_recent_exercise_sessions WHERE user_id=?;",
        userId,
      )).resolves.toEqual({ id: "cache-0" });
    } finally {
      database.close();
    }
  });
});

function session(index: number, sessionExerciseId = exerciseId): CachedRecentExerciseSession {
  const day = String(15 - index).padStart(2, "0");
  return {
    id: `cache-${index}${sessionExerciseId === otherExerciseId ? "-other" : ""}`,
    userId,
    exerciseId: sessionExerciseId,
    workoutId: `workout-${index}`,
    completedAt: `2026-09-${day}T12:00:00.000Z`,
    targetSets: 3,
    targetMinReps: 8,
    targetMaxReps: 10,
    workingSets: [{ weightKg: 80 + index, reps: 8, rpe: 8 }],
    serverUpdatedAt: `2026-09-${day}T12:05:00.000Z`,
  };
}

async function openDatabase(): Promise<NodeSQLiteConnection> {
  const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
  await configureLocalDatabase(database);
  return database;
}

async function seedCompletedLocalSession(database: NodeSQLiteConnection): Promise<void> {
  await database.runAsync(
    `INSERT INTO local_workouts (
      id, user_id, name, status, started_at, completed_at, notes,
      sync_status, created_at, updated_at, server_updated_at
    ) VALUES (?, ?, ?, 'completed', ?, ?, NULL, 'synced', ?, ?, ?);`,
    "local-workout", userId, "Local", "2026-09-16T10:00:00.000Z",
    "2026-09-16T11:00:00.000Z", "2026-09-16T10:00:00.000Z",
    "2026-09-16T11:00:00.000Z", "2026-09-16T11:01:00.000Z",
  );
  await database.runAsync(
    `INSERT INTO local_workout_exercises (
      id, user_id, workout_id, exercise_id, position, notes,
      sync_status, created_at, updated_at, server_updated_at
    ) VALUES (?, ?, ?, ?, 0, NULL, 'synced', ?, ?, ?);`,
    "local-workout-exercise", userId, "local-workout", exerciseId,
    "2026-09-16T10:00:00.000Z", "2026-09-16T11:00:00.000Z",
    "2026-09-16T11:01:00.000Z",
  );
  await database.runAsync(
    `INSERT INTO local_sets (
      id, user_id, workout_id, workout_exercise_id, exercise_id, position,
      set_type, weight_kg, reps, rpe, notes, completed_at, deleted_at,
      sync_status, created_at, updated_at, server_updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, 'working', 80, 8, 8, NULL, ?, NULL, 'synced', ?, ?, ?);`,
    "local-set", userId, "local-workout", "local-workout-exercise", exerciseId,
    "2026-09-16T10:50:00.000Z", "2026-09-16T10:50:00.000Z",
    "2026-09-16T10:50:00.000Z", "2026-09-16T11:01:00.000Z",
  );
}

const successfulSyncResult: SyncResult = {
  success: true,
  processed: 0,
  succeeded: 0,
  failed: 0,
  remainingQueueSize: 0,
  errors: [],
};
