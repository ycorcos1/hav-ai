import type { LocalMigration } from "./types";

export const createLocalUserExercisePreferencesMigration: LocalMigration = {
  version: 6,
  name: "create_local_user_exercise_preferences",
  async migrate(transaction) {
    await transaction.execAsync(`
      CREATE TABLE local_user_exercise_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
        notes TEXT NULL,
        rest_duration_seconds INTEGER NULL CHECK (
          rest_duration_seconds IS NULL OR rest_duration_seconds > 0
        ),
        sync_status TEXT NOT NULL CHECK (
          sync_status IN ('synced', 'pending_create', 'pending_update', 'pending_delete', 'failed')
        ),
        deleted_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        server_updated_at TEXT NULL,
        UNIQUE (user_id, exercise_id)
      );

      CREATE INDEX local_user_exercise_preferences_user_favorite_updated_idx
        ON local_user_exercise_preferences(user_id, is_favorite, updated_at DESC);
    `);
  },
};
