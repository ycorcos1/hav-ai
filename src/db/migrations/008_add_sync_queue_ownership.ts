import type { LocalMigration } from "./types";

const resolvedOwnerSql = `CASE entity_type
  WHEN 'workout_template' THEN (
    SELECT user_id FROM local_workout_templates WHERE id = sync_queue.entity_id
  )
  WHEN 'workout_template_exercise' THEN (
    SELECT user_id FROM local_workout_template_exercises WHERE id = sync_queue.entity_id
  )
  WHEN 'custom_exercise' THEN (
    SELECT owner_user_id FROM local_exercises
    WHERE id = sync_queue.entity_id AND is_system = 0
  )
  WHEN 'workout' THEN (
    SELECT user_id FROM local_workouts WHERE id = sync_queue.entity_id
  )
  WHEN 'workout_exercise' THEN (
    SELECT user_id FROM local_workout_exercises WHERE id = sync_queue.entity_id
  )
  WHEN 'set' THEN (
    SELECT user_id FROM local_sets WHERE id = sync_queue.entity_id
  )
  WHEN 'user_exercise_preference' THEN (
    SELECT user_id FROM local_user_exercise_preferences WHERE id = sync_queue.entity_id
  )
  WHEN 'progression_recommendation' THEN (
    SELECT user_id FROM local_progression_recommendations WHERE id = sync_queue.entity_id
  )
END`;

export const addSyncQueueOwnershipMigration: LocalMigration = {
  version: 8,
  name: "add_sync_queue_ownership",
  async migrate(transaction) {
    const unresolved = await transaction.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM sync_queue
      WHERE (${resolvedOwnerSql}) IS NULL;
    `);
    if ((unresolved?.count ?? 0) > 0) {
      throw new Error("Sync queue ownership cannot be recovered.");
    }

    await transaction.execAsync(`
      CREATE TABLE sync_queue_v8 (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (
          entity_type IN (
            'workout_template',
            'workout_template_exercise',
            'custom_exercise',
            'workout',
            'workout_exercise',
            'set',
            'user_exercise_preference',
            'progression_recommendation'
          )
        ),
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
        attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        last_error TEXT NULL,
        last_attempt_at TEXT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, entity_type, entity_id)
      );

      INSERT INTO sync_queue_v8 (
        id, user_id, entity_type, entity_id, operation, attempt_count,
        last_error, last_attempt_at, created_at
      )
      SELECT
        id, (${resolvedOwnerSql}), entity_type, entity_id, operation, attempt_count,
        last_error, last_attempt_at, created_at
      FROM sync_queue;

      DROP TABLE sync_queue;
      ALTER TABLE sync_queue_v8 RENAME TO sync_queue;

      CREATE INDEX sync_queue_user_pending_idx
        ON sync_queue(user_id, created_at, id);
    `);
  },
};
