import type { LocalMigration } from "./types";

export const createSyncQueueMigration: LocalMigration = {
  version: 4,
  name: "create_sync_queue",
  async migrate(transaction) {
    await transaction.execAsync(`
      CREATE TABLE sync_queue (
        id TEXT PRIMARY KEY,
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
        UNIQUE (entity_type, entity_id)
      );
    `);
  },
};
