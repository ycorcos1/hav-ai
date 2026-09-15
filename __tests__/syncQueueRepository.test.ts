import { DatabaseSync } from "node:sqlite";

import { configureLocalDatabase, SQLiteSyncQueueRepository } from "@/db";
import type { SyncEntityType, SyncQueueItem } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const timestamp = "2026-09-15T16:00:00.000Z";
const attemptAt = "2026-09-15T16:05:00.000Z";
const entities = [
  { type: "workout_template", id: "template-a" },
  { type: "workout_template_exercise", id: "template-exercise-a" },
  { type: "custom_exercise", id: "custom-exercise-a" },
  { type: "workout", id: "workout-a" },
  { type: "workout_exercise", id: "workout-exercise-a" },
  { type: "set", id: "set-a" },
  { type: "user_exercise_preference", id: "preference-a" },
  { type: "progression_recommendation", id: "recommendation-a" },
] as const satisfies readonly { id: string; type: SyncEntityType }[];

describe("SQLiteSyncQueueRepository", () => {
  it("enqueues all eight canonical types and returns deterministic owner-scoped order", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    try {
      await configureLocalDatabase(database);
      await seedEntities(database);
      const repository = new SQLiteSyncQueueRepository(database, "user-a");
      for (const [index, entity] of [...entities].reverse().entries()) {
        await repository.enqueueOrCoalesce(queueItem(
          `queue-${index}`,
          entity.type,
          entity.id,
          `2026-09-15T16:00:0${index}.000Z`,
        ));
      }

      const pending = await repository.getPending();
      expect(pending).toHaveLength(8);
      expect(pending.map(({ createdAt }) => createdAt)).toEqual(
        [...pending.map(({ createdAt }) => createdAt)].sort(),
      );
      await expect(new SQLiteSyncQueueRepository(database, "user-b").getPending())
        .resolves.toEqual([]);
    } finally {
      database.close();
    }
  });

  it("coalesces to the latest operation while preserving queue identity and resetting attempts", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    try {
      await configureLocalDatabase(database);
      await seedEntities(database);
      const repository = new SQLiteSyncQueueRepository(database, "user-a", () => attemptAt);
      await repository.enqueueOrCoalesce(queueItem(
        "queue-original", "set", "set-a", timestamp,
      ));
      await repository.markAttempt("queue-original", "Temporary failure");
      await expect(repository.getPending()).resolves.toEqual([
        expect.objectContaining({
          id: "queue-original",
          attemptCount: 1,
          lastAttemptAt: attemptAt,
          lastError: "Temporary failure",
        }),
      ]);

      await repository.enqueueOrCoalesce({
        ...queueItem("queue-replacement", "set", "set-a", "later"),
        operation: "delete",
      });
      await expect(repository.getPending()).resolves.toEqual([{
        ...queueItem("queue-original", "set", "set-a", timestamp),
        operation: "delete",
      }]);
    } finally {
      database.close();
    }
  });

  it("defends attempt, removal, queue-ID, and entity-ID operations across users", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    try {
      await configureLocalDatabase(database);
      await seedEntities(database);
      const ownerA = new SQLiteSyncQueueRepository(database, "user-a", () => attemptAt);
      const ownerB = new SQLiteSyncQueueRepository(database, "user-b", () => attemptAt);
      await ownerA.enqueueOrCoalesce(queueItem("queue-a", "workout", "workout-a", timestamp));

      await ownerB.markAttempt("queue-a", "attack");
      await ownerB.remove("queue-a");
      await expect(ownerA.getPending()).resolves.toEqual([
        queueItem("queue-a", "workout", "workout-a", timestamp),
      ]);
      await expect(ownerB.enqueueOrCoalesce(
        queueItem("queue-b", "workout", "workout-a", timestamp),
      )).rejects.toThrow("Sync queue entity is not accessible to its user.");

      await expect(ownerB.enqueueOrCoalesce(
        queueItem("queue-a", "workout", "workout-b", timestamp),
      )).rejects.toThrow();
      await expect(ownerA.getPending()).resolves.toEqual([
        queueItem("queue-a", "workout", "workout-a", timestamp),
      ]);
    } finally {
      database.close();
    }
  });

  it("removes only the current owner's queue item", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    try {
      await configureLocalDatabase(database);
      await seedEntities(database);
      const repository = new SQLiteSyncQueueRepository(database, "user-a");
      await repository.enqueueOrCoalesce(queueItem("queue-a", "set", "set-a", timestamp));
      await repository.remove("queue-a");
      await expect(repository.getPending()).resolves.toEqual([]);
    } finally {
      database.close();
    }
  });
});

function queueItem(
  id: string,
  entityType: SyncEntityType,
  entityId: string,
  createdAt: string,
): SyncQueueItem {
  return { id, entityType, entityId, operation: "upsert", attemptCount: 0, createdAt };
}

async function seedEntities(database: NodeSQLiteConnection): Promise<void> {
  await database.execAsync(`
    INSERT INTO local_workout_templates
      (id, user_id, name, is_archived, sync_status, created_at, updated_at)
    VALUES ('template-a', 'user-a', 'Template', 0, 'pending_create', '${timestamp}', '${timestamp}');
    INSERT INTO local_workout_template_exercises
      (id, user_id, template_id, exercise_id, position, target_sets,
       target_min_reps, target_max_reps, sync_status, created_at, updated_at)
    VALUES ('template-exercise-a', 'user-a', 'template-a', 'system-exercise', 0, 3,
            8, 10, 'pending_create', '${timestamp}', '${timestamp}');
    INSERT INTO local_exercises
      (id, owner_user_id, name, primary_muscle_group, secondary_muscle_groups_json,
       equipment_type, measurement_type, is_system, is_archived, sync_status,
       created_at, updated_at)
    VALUES ('custom-exercise-a', 'user-a', 'Custom Press', 'chest', '[]',
            'barbell', 'weight_reps', 0, 0, 'pending_create', '${timestamp}', '${timestamp}');
    INSERT INTO local_workouts
      (id, user_id, name, status, started_at, sync_status, created_at, updated_at)
    VALUES ('workout-a', 'user-a', 'Workout A', 'active', '${timestamp}',
            'pending_create', '${timestamp}', '${timestamp}'),
           ('workout-b', 'user-b', 'Workout B', 'active', '${timestamp}',
            'pending_create', '${timestamp}', '${timestamp}');
    INSERT INTO local_workout_exercises
      (id, user_id, workout_id, exercise_id, position, sync_status, created_at, updated_at)
    VALUES ('workout-exercise-a', 'user-a', 'workout-a', 'system-exercise', 0,
            'pending_create', '${timestamp}', '${timestamp}');
    INSERT INTO local_sets
      (id, user_id, workout_id, workout_exercise_id, exercise_id, position, set_type,
       reps, completed_at, sync_status, created_at, updated_at)
    VALUES ('set-a', 'user-a', 'workout-a', 'workout-exercise-a', 'system-exercise', 0,
            'working', 10, '${timestamp}', 'pending_create', '${timestamp}', '${timestamp}');
    INSERT INTO local_user_exercise_preferences
      (id, user_id, exercise_id, is_favorite, sync_status, created_at, updated_at)
    VALUES ('preference-a', 'user-a', 'system-exercise', 1, 'pending_create',
            '${timestamp}', '${timestamp}');
    INSERT INTO local_progression_recommendations
      (id, user_id, exercise_id, recommendation_type, confidence, reason_codes_json,
       status, engine_version, sync_status, created_at, updated_at)
    VALUES ('recommendation-a', 'user-a', 'system-exercise', 'insufficient_data', 'low',
            '["INSUFFICIENT_HISTORY"]', 'active', 'progression-v1', 'pending_create',
            '${timestamp}', '${timestamp}');
  `);
}
