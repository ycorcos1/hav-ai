import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { getLocalSchemaVersion, runLocalMigrations } from "@/db";
import { localMigrations } from "@/db/migrations/registry";

import { NodeSQLiteConnection } from "../test-utils/NodeSQLiteConnection";

const timestamp = "2026-09-15T16:00:00.000Z";

describe("sync queue ownership migration", () => {
  it("backfills all eight entity owners without changing queue state", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    try {
      await runLocalMigrations(database, localMigrations.filter(({ version }) => version <= 7));
      await seedAllOwnedEntities(database);
      await seedVersionSevenQueue(database);

      await expect(runLocalMigrations(database)).resolves.toBe(8);
      await expect(database.getAllAsync<{
        attempt_count: number;
        created_at: string;
        entity_type: string;
        id: string;
        last_attempt_at: string | null;
        last_error: string | null;
        operation: string;
        user_id: string;
      }>(`SELECT id, user_id, entity_type, operation, attempt_count,
                  last_error, last_attempt_at, created_at
           FROM sync_queue ORDER BY id;`)).resolves.toEqual(
        Array.from({ length: 8 }, (_, index) => ({
          id: `queue-${index}`,
          user_id: "user-a",
          entity_type: entityTypes[index].type,
          operation: index % 2 === 0 ? "upsert" : "delete",
          attempt_count: index,
          last_error: index === 7 ? "Temporary failure" : null,
          last_attempt_at: index === 7 ? timestamp : null,
          created_at: timestamp,
        })),
      );
    } finally {
      database.close();
    }
  });

  it("rolls back and preserves version-seven rows when ownership is unresolved", async () => {
    const database = new NodeSQLiteConnection(new DatabaseSync(":memory:"));
    try {
      await runLocalMigrations(database, localMigrations.filter(({ version }) => version <= 7));
      await database.runAsync(
        `INSERT INTO sync_queue (id, entity_type, entity_id, operation, created_at)
         VALUES (?, 'workout', ?, 'upsert', ?);`,
        "orphan-queue",
        "missing-workout",
        timestamp,
      );

      await expect(runLocalMigrations(database)).rejects.toThrow(
        "Sync queue ownership cannot be recovered.",
      );
      await expect(getLocalSchemaVersion(database)).resolves.toBe(7);
      await expect(database.getFirstAsync<{ id: string }>(
        "SELECT id FROM sync_queue WHERE id=?;",
        "orphan-queue",
      )).resolves.toEqual({ id: "orphan-queue" });
      await expect(database.getAllAsync<{ name: string }>(
        "PRAGMA table_info(sync_queue);",
      )).resolves.not.toEqual(expect.arrayContaining([{ name: "user_id" }]));
    } finally {
      database.close();
    }
  });

  it("preserves owner-scoped queue state across a real close and reopen", async () => {
    const directory = mkdtempSync(join(tmpdir(), "havai-owned-queue-"));
    const filename = join(directory, "queue.db");
    try {
      const database = new NodeSQLiteConnection(new DatabaseSync(filename));
      await runLocalMigrations(database, localMigrations.filter(({ version }) => version <= 7));
      await seedAllOwnedEntities(database);
      await seedVersionSevenQueue(database);
      await runLocalMigrations(database);
      database.close();

      const reopened = new NodeSQLiteConnection(new DatabaseSync(filename));
      try {
        await expect(getLocalSchemaVersion(reopened)).resolves.toBe(8);
        await expect(reopened.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) AS count FROM sync_queue WHERE user_id='user-a';",
        )).resolves.toEqual({ count: 8 });
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

const entityTypes = [
  { type: "workout_template", id: "template-a" },
  { type: "workout_template_exercise", id: "template-exercise-a" },
  { type: "custom_exercise", id: "custom-exercise-a" },
  { type: "workout", id: "workout-a" },
  { type: "workout_exercise", id: "workout-exercise-a" },
  { type: "set", id: "set-a" },
  { type: "user_exercise_preference", id: "preference-a" },
  { type: "progression_recommendation", id: "recommendation-a" },
] as const;

async function seedVersionSevenQueue(database: NodeSQLiteConnection): Promise<void> {
  for (const [index, entity] of entityTypes.entries()) {
    await database.runAsync(
      `INSERT INTO sync_queue (
         id, entity_type, entity_id, operation, attempt_count,
         last_error, last_attempt_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      `queue-${index}`,
      entity.type,
      entity.id,
      index % 2 === 0 ? "upsert" : "delete",
      index,
      index === 7 ? "Temporary failure" : null,
      index === 7 ? timestamp : null,
      timestamp,
    );
  }
}

async function seedAllOwnedEntities(database: NodeSQLiteConnection): Promise<void> {
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
    VALUES ('workout-a', 'user-a', 'Workout', 'active', '${timestamp}',
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
