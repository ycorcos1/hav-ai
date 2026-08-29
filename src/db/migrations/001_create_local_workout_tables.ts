import type { LocalMigration } from "./types";

export const createLocalWorkoutTablesMigration: LocalMigration = {
  version: 1,
  name: "create_local_workout_tables",
  async migrate(transaction) {
    await transaction.execAsync(`
      CREATE TABLE local_workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        source_template_id TEXT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'discarded')),
        started_at TEXT NOT NULL,
        completed_at TEXT NULL,
        notes TEXT NULL,
        sync_status TEXT NOT NULL CHECK (
          sync_status IN ('synced', 'pending_create', 'pending_update', 'pending_delete', 'failed')
        ),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        server_updated_at TEXT NULL
      );

      CREATE TABLE local_workout_exercises (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workout_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        position INTEGER NOT NULL CHECK (position >= 0),
        target_sets INTEGER NULL CHECK (target_sets IS NULL OR target_sets > 0),
        target_min_reps INTEGER NULL CHECK (target_min_reps IS NULL OR target_min_reps > 0),
        target_max_reps INTEGER NULL CHECK (target_max_reps IS NULL OR target_max_reps > 0),
        target_weight_kg REAL NULL CHECK (target_weight_kg IS NULL OR target_weight_kg >= 0),
        source_recommendation_id TEXT NULL,
        notes TEXT NULL,
        sync_status TEXT NOT NULL CHECK (
          sync_status IN ('synced', 'pending_create', 'pending_update', 'pending_delete', 'failed')
        ),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        server_updated_at TEXT NULL,
        FOREIGN KEY (workout_id) REFERENCES local_workouts(id) ON DELETE CASCADE,
        UNIQUE (workout_id, position),
        UNIQUE (id, workout_id, exercise_id),
        CHECK (
          target_min_reps IS NULL
          OR target_max_reps IS NULL
          OR target_max_reps >= target_min_reps
        )
      );

      CREATE TABLE local_sets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        workout_id TEXT NOT NULL,
        workout_exercise_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        position INTEGER NOT NULL CHECK (position >= 0),
        set_type TEXT NOT NULL CHECK (set_type IN ('working', 'warmup')),
        weight_kg REAL NULL CHECK (weight_kg IS NULL OR weight_kg >= 0),
        reps INTEGER NOT NULL CHECK (reps >= 0),
        rpe REAL NULL CHECK (rpe IS NULL OR (rpe >= 6 AND rpe <= 10)),
        notes TEXT NULL,
        completed_at TEXT NOT NULL,
        sync_status TEXT NOT NULL CHECK (
          sync_status IN ('synced', 'pending_create', 'pending_update', 'pending_delete', 'failed')
        ),
        deleted_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        server_updated_at TEXT NULL,
        FOREIGN KEY (workout_id) REFERENCES local_workouts(id) ON DELETE CASCADE,
        FOREIGN KEY (workout_exercise_id, workout_id, exercise_id)
          REFERENCES local_workout_exercises(id, workout_id, exercise_id)
          ON DELETE CASCADE,
        UNIQUE (workout_exercise_id, position)
      );

      CREATE INDEX local_workouts_user_started_at_idx
        ON local_workouts(user_id, started_at DESC);
      CREATE INDEX local_workouts_user_status_idx
        ON local_workouts(user_id, status);
      CREATE INDEX local_workout_exercises_user_exercise_idx
        ON local_workout_exercises(user_id, exercise_id);
      CREATE INDEX local_sets_workout_idx
        ON local_sets(workout_id);
      CREATE INDEX local_sets_user_exercise_completed_at_idx
        ON local_sets(user_id, exercise_id, completed_at DESC);
    `);
  },
};
