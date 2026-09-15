import { DatabaseSync } from "node:sqlite";

import {
  configureLocalDatabase,
  SQLiteSyncDependencyResolver,
  SQLiteSyncQueueRepository,
} from "@/db";
import { planSyncDependencies } from "@/features/sync/services";
import type { SyncEntityType, SyncQueueItem } from "@/shared/contracts";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const baseTime = Date.parse("2026-09-15T17:00:00.000Z");

describe("sync dependency graph", () => {
  it("orders concrete parent, custom-exercise, preference, and workout dependencies", async () => {
    const database = await seededDatabase();
    try {
      const resolver = new SQLiteSyncDependencyResolver(database, "user-a");
      const items = [
        item("q-set", "set", "set-a", 8),
        item("q-template-exercise", "workout_template_exercise", "template-exercise-a", 7),
        item("q-preference", "user_exercise_preference", "preference-a", 6),
        item("q-workout-exercise", "workout_exercise", "workout-exercise-a", 5),
        item("q-workout", "workout", "workout-a", 4),
        item("q-template", "workout_template", "template-a", 3),
        item("q-custom", "custom_exercise", "custom-exercise-a", 2),
      ];

      const plan = await planSyncDependencies(items, resolver);
      const order = plan.processable.map(({ id }) => id);

      expect(plan.blocked).toEqual([]);
      expect(plan.cycles).toEqual([]);
      expectBefore(order, "q-custom", "q-template-exercise");
      expectBefore(order, "q-custom", "q-workout-exercise");
      expectBefore(order, "q-custom", "q-preference");
      expectBefore(order, "q-template", "q-template-exercise");
      expectBefore(order, "q-template", "q-workout");
      expectBefore(order, "q-workout", "q-workout-exercise");
      expectBefore(order, "q-workout-exercise", "q-set");
    } finally {
      database.close();
    }
  });

  it("uses referenced entity IDs instead of broad entity-type ordering", async () => {
    const database = await seededDatabase();
    try {
      await database.execAsync(`
        INSERT INTO local_workouts
          (id, user_id, name, status, started_at, sync_status, created_at, updated_at)
        VALUES ('workout-b', 'user-a', 'B', 'completed', '${iso(0)}',
                'pending_create', '${iso(0)}', '${iso(0)}');
        INSERT INTO local_workout_exercises
          (id, user_id, workout_id, exercise_id, position, sync_status, created_at, updated_at)
        VALUES ('workout-exercise-b', 'user-a', 'workout-b', 'system-exercise', 0,
                'pending_create', '${iso(0)}', '${iso(0)}');
      `);
      const items = [
        item("q-child-a", "workout_exercise", "workout-exercise-a", 0),
        item("q-parent-b", "workout", "workout-b", 1),
        item("q-parent-a", "workout", "workout-a", 2),
      ];

      const plan = await planSyncDependencies(
        items,
        new SQLiteSyncDependencyResolver(database, "user-a"),
      );

      expect(plan.processable.map(({ id }) => id)).toEqual([
        "q-parent-b",
        "q-parent-a",
        "q-child-a",
      ]);
    } finally {
      database.close();
    }
  });

  it("orders a normal chronological recommendation chain by actual references", async () => {
    const database = await seededDatabase();
    try {
      await database.execAsync(`
        INSERT INTO local_progression_recommendations
          (id, user_id, exercise_id, source_workout_id, source_workout_exercise_id,
           recommendation_type, confidence, reason_codes_json, status, engine_version,
           sync_status, created_at, updated_at)
        VALUES ('recommendation-a', 'user-a', 'custom-exercise-a', 'workout-a',
                'workout-exercise-a', 'increase_reps', 'high', '["TOTAL_REPS_IMPROVED"]',
                'consumed', 'progression-v1', 'pending_create', '${iso(2)}', '${iso(2)}');
        INSERT INTO local_workouts
          (id, user_id, name, status, started_at, sync_status, created_at, updated_at)
        VALUES ('workout-later', 'user-a', 'Later', 'active', '${iso(3)}',
                'pending_create', '${iso(3)}', '${iso(3)}');
        INSERT INTO local_workout_exercises
          (id, user_id, workout_id, exercise_id, position, source_recommendation_id,
           sync_status, created_at, updated_at)
        VALUES ('workout-exercise-later', 'user-a', 'workout-later', 'custom-exercise-a', 0,
                'recommendation-a', 'pending_create', '${iso(4)}', '${iso(4)}');
      `);
      const items = [
        item("q-later-exercise", "workout_exercise", "workout-exercise-later", 0),
        item("q-recommendation", "progression_recommendation", "recommendation-a", 3),
        item("q-earlier-exercise", "workout_exercise", "workout-exercise-a", 2),
        item("q-later-workout", "workout", "workout-later", 4),
        item("q-earlier-workout", "workout", "workout-a", 1),
        item("q-custom", "custom_exercise", "custom-exercise-a", 0),
      ];

      const plan = await planSyncDependencies(
        items,
        new SQLiteSyncDependencyResolver(database, "user-a"),
      );
      const order = plan.processable.map(({ id }) => id);

      expect(plan.cycles).toEqual([]);
      expectBefore(order, "q-earlier-workout", "q-earlier-exercise");
      expectBefore(order, "q-earlier-exercise", "q-recommendation");
      expectBefore(order, "q-recommendation", "q-later-exercise");
      expectBefore(order, "q-later-workout", "q-later-exercise");
      expectBefore(order, "q-custom", "q-earlier-exercise");
      expectBefore(order, "q-custom", "q-recommendation");
    } finally {
      database.close();
    }
  });

  it("reports a deterministic mutual cycle while preserving pending items and unrelated work", async () => {
    const database = await seededDatabase();
    try {
      await database.runAsync(
        "UPDATE local_workout_exercises SET source_recommendation_id = ? WHERE id = ?;",
        "recommendation-cycle",
        "workout-exercise-a",
      );
      await database.execAsync(`
        INSERT INTO local_progression_recommendations
          (id, user_id, exercise_id, source_workout_id, source_workout_exercise_id,
           recommendation_type, confidence, reason_codes_json, status, engine_version,
           sync_status, created_at, updated_at)
        VALUES ('recommendation-cycle', 'user-a', 'custom-exercise-a', 'workout-a',
                'workout-exercise-a', 'repeat_target', 'medium', '["PERFORMANCE_REPEATED"]',
                'active', 'progression-v1', 'pending_create', '${iso(2)}', '${iso(2)}');
        INSERT INTO local_workouts
          (id, user_id, name, status, started_at, sync_status, created_at, updated_at)
        VALUES ('workout-independent', 'user-a', 'Independent', 'active', '${iso(1)}',
                'pending_create', '${iso(1)}', '${iso(1)}');
      `);
      const repository = new SQLiteSyncQueueRepository(database, "user-a");
      const queued = [
        item("q-recommendation", "progression_recommendation", "recommendation-cycle", 2),
        item("q-exercise", "workout_exercise", "workout-exercise-a", 1),
        item("q-independent", "workout", "workout-independent", 0),
      ];
      for (const queueItem of queued) await repository.enqueueOrCoalesce(queueItem);

      const resolver = new SQLiteSyncDependencyResolver(database, "user-a");
      const first = await planSyncDependencies(await repository.getPending(), resolver);
      const second = await planSyncDependencies([...await repository.getPending()].reverse(), resolver);

      expect(first.processable.map(({ id }) => id)).toEqual(["q-independent"]);
      expect(first.blocked.map(({ id }) => id)).toEqual(["q-exercise", "q-recommendation"]);
      expect(first.cycles).toEqual([{
        code: "SYNC_DEPENDENCY_CYCLE",
        message: "Some local changes are blocked by a dependency cycle.",
        members: [
          { entityType: "workout_exercise", entityId: "workout-exercise-a" },
          { entityType: "progression_recommendation", entityId: "recommendation-cycle" },
        ],
      }]);
      expect(second).toEqual(first);
      await expect(repository.getPending()).resolves.toHaveLength(3);
      await expect(database.getFirstAsync<{
        source_recommendation_id: string | null;
      }>("SELECT source_recommendation_id FROM local_workout_exercises WHERE id = ?;", "workout-exercise-a"))
        .resolves.toEqual({ source_recommendation_id: "recommendation-cycle" });
      await expect(database.getFirstAsync<{
        source_workout_exercise_id: string | null;
      }>("SELECT source_workout_exercise_id FROM local_progression_recommendations WHERE id = ?;", "recommendation-cycle"))
        .resolves.toEqual({ source_workout_exercise_id: "workout-exercise-a" });
    } finally {
      database.close();
    }
  });
});

async function seededDatabase(): Promise<NodeSQLiteConnection> {
  const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
  await configureLocalDatabase(database);
  await database.execAsync(`
    INSERT INTO local_exercises
      (id, owner_user_id, name, primary_muscle_group, secondary_muscle_groups_json,
       equipment_type, measurement_type, is_system, is_archived, sync_status,
       created_at, updated_at)
    VALUES ('custom-exercise-a', 'user-a', 'Custom Press', 'chest', '[]', 'barbell',
            'weight_reps', 0, 0, 'pending_create', '${iso(0)}', '${iso(0)}'),
           ('system-exercise', NULL, 'System Press', 'chest', '[]', 'barbell',
            'weight_reps', 1, 0, 'synced', '${iso(0)}', '${iso(0)}');
    INSERT INTO local_workout_templates
      (id, user_id, name, is_archived, sync_status, created_at, updated_at)
    VALUES ('template-a', 'user-a', 'Template', 0, 'pending_create', '${iso(0)}', '${iso(0)}');
    INSERT INTO local_workout_template_exercises
      (id, user_id, template_id, exercise_id, position, target_sets, target_min_reps,
       target_max_reps, sync_status, created_at, updated_at)
    VALUES ('template-exercise-a', 'user-a', 'template-a', 'custom-exercise-a', 0, 3, 8,
            10, 'pending_create', '${iso(0)}', '${iso(0)}');
    INSERT INTO local_workouts
      (id, user_id, source_template_id, name, status, started_at, sync_status,
       created_at, updated_at)
    VALUES ('workout-a', 'user-a', 'template-a', 'A', 'completed', '${iso(1)}',
            'pending_create', '${iso(1)}', '${iso(1)}');
    INSERT INTO local_workout_exercises
      (id, user_id, workout_id, exercise_id, position, sync_status, created_at, updated_at)
    VALUES ('workout-exercise-a', 'user-a', 'workout-a', 'custom-exercise-a', 0,
            'pending_create', '${iso(1)}', '${iso(1)}');
    INSERT INTO local_sets
      (id, user_id, workout_id, workout_exercise_id, exercise_id, position, set_type,
       reps, completed_at, sync_status, created_at, updated_at)
    VALUES ('set-a', 'user-a', 'workout-a', 'workout-exercise-a', 'custom-exercise-a', 0,
            'working', 10, '${iso(1)}', 'pending_create', '${iso(1)}', '${iso(1)}');
    INSERT INTO local_user_exercise_preferences
      (id, user_id, exercise_id, is_favorite, sync_status, created_at, updated_at)
    VALUES ('preference-a', 'user-a', 'custom-exercise-a', 1, 'pending_create',
            '${iso(1)}', '${iso(1)}');
  `);
  return database;
}

function item(
  id: string,
  entityType: SyncEntityType,
  entityId: string,
  seconds: number,
): SyncQueueItem {
  return {
    id,
    entityType,
    entityId,
    operation: "upsert",
    attemptCount: 0,
    createdAt: iso(seconds),
  };
}

function iso(seconds: number): string {
  return new Date(baseTime + seconds * 1_000).toISOString();
}

function expectBefore(order: string[], first: string, second: string): void {
  expect(order.indexOf(first)).toBeGreaterThanOrEqual(0);
  expect(order.indexOf(first)).toBeLessThan(order.indexOf(second));
}
