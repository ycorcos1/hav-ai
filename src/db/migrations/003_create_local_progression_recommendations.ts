import type { LocalMigration } from "./types";

export const createLocalProgressionRecommendationsMigration: LocalMigration = {
  version: 3,
  name: "create_local_progression_recommendations",
  async migrate(transaction) {
    await transaction.execAsync(`
      CREATE TABLE local_progression_recommendations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        source_workout_id TEXT NULL,
        source_workout_exercise_id TEXT NULL,
        recommendation_type TEXT NOT NULL CHECK (
          recommendation_type IN (
            'increase_weight',
            'maintain_weight',
            'increase_reps',
            'repeat_target',
            'decrease_weight',
            'insufficient_data'
          )
        ),
        recommended_weight_kg REAL NULL CHECK (
          recommended_weight_kg IS NULL OR recommended_weight_kg >= 0
        ),
        target_sets INTEGER NULL CHECK (target_sets IS NULL OR target_sets > 0),
        target_min_reps INTEGER NULL CHECK (target_min_reps IS NULL OR target_min_reps > 0),
        target_max_reps INTEGER NULL CHECK (target_max_reps IS NULL OR target_max_reps > 0),
        target_set_reps_json TEXT NULL CHECK (
          target_set_reps_json IS NULL
          OR (json_valid(target_set_reps_json) AND json_type(target_set_reps_json) = 'array')
        ),
        confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
        reason_codes_json TEXT NOT NULL CHECK (
          json_valid(reason_codes_json) AND json_type(reason_codes_json) = 'array'
        ),
        status TEXT NOT NULL CHECK (status IN ('active', 'consumed', 'superseded')),
        engine_version TEXT NOT NULL,
        consumed_at TEXT NULL,
        sync_status TEXT NOT NULL CHECK (
          sync_status IN ('synced', 'pending_create', 'pending_update', 'pending_delete', 'failed')
        ),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        server_updated_at TEXT NULL,
        FOREIGN KEY (source_workout_id) REFERENCES local_workouts(id) ON DELETE SET NULL,
        FOREIGN KEY (source_workout_exercise_id)
          REFERENCES local_workout_exercises(id)
          ON DELETE SET NULL,
        CHECK (
          target_min_reps IS NULL
          OR target_max_reps IS NULL
          OR target_max_reps >= target_min_reps
        )
      );

      CREATE INDEX local_progression_recommendations_user_exercise_status_idx
        ON local_progression_recommendations(user_id, exercise_id, status);
    `);
  },
};
