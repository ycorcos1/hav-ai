import type { ISODateTime, ProgressionRecommendation } from "@/shared/contracts";

import { progressionRecommendationFromRow, progressionRecommendationToRow } from "../mappers";
import type { LocalProgressionRecommendationRow } from "../mappers";
import type { TransactionalLocalDatabaseConnection } from "../types";
import { metadataForUpsert, placeholders } from "./repositoryUtils";
import type { LocalRecommendationRepository } from "./types";

const columns = ["id", "user_id", "exercise_id", "source_workout_id", "source_workout_exercise_id", "recommendation_type", "recommended_weight_kg", "target_sets", "target_min_reps", "target_max_reps", "target_set_reps_json", "confidence", "reason_codes_json", "status", "engine_version", "consumed_at", "sync_status", "created_at", "updated_at", "server_updated_at"];

export class SQLiteLocalRecommendationRepository implements LocalRecommendationRepository {
  constructor(private readonly database: TransactionalLocalDatabaseConnection) {}

  async getById(userId: string, id: string): Promise<ProgressionRecommendation | null> {
    const row = await this.database.getFirstAsync<LocalProgressionRecommendationRow>("SELECT * FROM local_progression_recommendations WHERE id=? AND user_id=?;", id, userId);
    return row ? progressionRecommendationFromRow(row) : null;
  }

  async getActiveForExercise(userId: string, exerciseId: string): Promise<ProgressionRecommendation | null> {
    const row = await this.database.getFirstAsync<LocalProgressionRecommendationRow>(`SELECT * FROM local_progression_recommendations
      WHERE user_id=? AND exercise_id=? AND status='active' ORDER BY created_at DESC LIMIT 1;`, userId, exerciseId);
    return row ? progressionRecommendationFromRow(row) : null;
  }

  async upsert(recommendation: ProgressionRecommendation): Promise<void> {
    if (recommendation.sourceWorkoutId) {
      const source = await this.database.getFirstAsync<{ id: string }>(
        "SELECT id FROM local_workouts WHERE id=? AND user_id=?;",
        recommendation.sourceWorkoutId, recommendation.userId,
      );
      if (!source) throw new Error("Recommendation source workout is not accessible to its user.");
    }
    if (recommendation.sourceWorkoutExerciseId) {
      const source = await this.database.getFirstAsync<{ id: string }>(
        "SELECT id FROM local_workout_exercises WHERE id=? AND user_id=?;",
        recommendation.sourceWorkoutExerciseId, recommendation.userId,
      );
      if (!source) throw new Error("Recommendation source exercise is not accessible to its user.");
    }
    const metadata = await metadataForUpsert(this.database, "local_progression_recommendations", "user_id", recommendation.userId, recommendation.id);
    const row = progressionRecommendationToRow(recommendation, metadata);
    await this.database.runAsync(`INSERT INTO local_progression_recommendations (${columns.join(", ")}) VALUES (${placeholders(columns.length)})
      ON CONFLICT(id) DO UPDATE SET exercise_id=excluded.exercise_id,
      source_workout_id=excluded.source_workout_id, source_workout_exercise_id=excluded.source_workout_exercise_id,
      recommendation_type=excluded.recommendation_type, recommended_weight_kg=excluded.recommended_weight_kg,
      target_sets=excluded.target_sets, target_min_reps=excluded.target_min_reps,
      target_max_reps=excluded.target_max_reps, target_set_reps_json=excluded.target_set_reps_json,
      confidence=excluded.confidence, reason_codes_json=excluded.reason_codes_json,
      status=excluded.status, engine_version=excluded.engine_version, consumed_at=excluded.consumed_at,
      sync_status=excluded.sync_status, updated_at=excluded.updated_at
      WHERE local_progression_recommendations.user_id=excluded.user_id;`,
      ...columns.map((column) => row[column as keyof LocalProgressionRecommendationRow]));
  }

  async markConsumed(userId: string, id: string, consumedAt: ISODateTime): Promise<void> {
    await this.database.runAsync(`UPDATE local_progression_recommendations SET status='consumed', consumed_at=?, updated_at=?,
      sync_status=CASE WHEN sync_status='pending_create' THEN 'pending_create' ELSE 'pending_update' END
      WHERE id=? AND user_id=?;`, consumedAt, consumedAt, id, userId);
  }

  async supersede(userId: string, id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync(`UPDATE local_progression_recommendations SET status='superseded', updated_at=?,
      sync_status=CASE WHEN sync_status='pending_create' THEN 'pending_create' ELSE 'pending_update' END
      WHERE id=? AND user_id=?;`, now, id, userId);
  }
}
