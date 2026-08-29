import type { LocalMigration } from "./types";

export const createLocalTemplateTablesMigration: LocalMigration = {
  version: 2,
  name: "create_local_template_tables",
  async migrate(transaction) {
    await transaction.execAsync(`
      CREATE TABLE local_workout_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        notes TEXT NULL,
        is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
        sync_status TEXT NOT NULL CHECK (
          sync_status IN ('synced', 'pending_create', 'pending_update', 'pending_delete', 'failed')
        ),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        server_updated_at TEXT NULL
      );

      CREATE TABLE local_workout_template_exercises (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        position INTEGER NOT NULL CHECK (position >= 0),
        target_sets INTEGER NOT NULL CHECK (target_sets > 0),
        target_min_reps INTEGER NOT NULL CHECK (target_min_reps > 0),
        target_max_reps INTEGER NOT NULL CHECK (target_max_reps >= target_min_reps),
        notes TEXT NULL,
        sync_status TEXT NOT NULL CHECK (
          sync_status IN ('synced', 'pending_create', 'pending_update', 'pending_delete', 'failed')
        ),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        server_updated_at TEXT NULL,
        FOREIGN KEY (template_id) REFERENCES local_workout_templates(id) ON DELETE CASCADE,
        UNIQUE (template_id, position)
      );

      CREATE INDEX local_workout_templates_user_updated_at_idx
        ON local_workout_templates(user_id, updated_at DESC);
      CREATE INDEX local_workout_templates_user_archived_idx
        ON local_workout_templates(user_id, is_archived);
    `);
  },
};
