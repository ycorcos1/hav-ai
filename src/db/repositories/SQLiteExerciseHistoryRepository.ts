import type { ExerciseSessionPerformance, WorkoutSet } from "@/shared/contracts";

import { workoutSetFromRow, type LocalWorkoutSetRow } from "../mappers";
import type { TransactionalLocalDatabaseConnection } from "../types";
import type { ExerciseHistoryRepository } from "./types";

type SessionSetRow = LocalWorkoutSetRow & {
  session_completed_at: string;
  session_workout_id: string;
  workout_exercise_position: number;
};

export class SQLiteExerciseHistoryRepository implements ExerciseHistoryRepository {
  constructor(private readonly database: TransactionalLocalDatabaseConnection) {}

  async getRecentSessions({
    userId,
    exerciseId,
    limit,
  }: Parameters<ExerciseHistoryRepository["getRecentSessions"]>[0]): Promise<ExerciseSessionPerformance[]> {
    if (limit <= 0) return [];
    const rows = await this.database.getAllAsync<SessionSetRow>(
      `WITH recent_workouts AS (
         SELECT DISTINCT w.id, w.completed_at
         FROM local_workouts w
         JOIN local_workout_exercises we ON we.workout_id=w.id AND we.user_id=w.user_id
         JOIN local_sets s ON s.workout_exercise_id=we.id AND s.user_id=w.user_id
         WHERE w.user_id=? AND w.status='completed' AND w.completed_at IS NOT NULL
           AND we.exercise_id=? AND s.set_type='working' AND s.deleted_at IS NULL
         ORDER BY w.completed_at DESC
         LIMIT ?
       )
       SELECT s.*, rw.id AS session_workout_id,
         rw.completed_at AS session_completed_at,
         we.position AS workout_exercise_position
       FROM recent_workouts rw
       JOIN local_workout_exercises we ON we.workout_id=rw.id AND we.exercise_id=?
       JOIN local_sets s ON s.workout_exercise_id=we.id
       WHERE s.user_id=? AND s.set_type='working' AND s.deleted_at IS NULL
       ORDER BY rw.completed_at DESC, we.position, s.position;`,
      userId,
      exerciseId,
      limit,
      exerciseId,
      userId,
    );

    const sessions = new Map<string, ExerciseSessionPerformance>();
    rows.forEach((row) => {
      const session = sessions.get(row.session_workout_id) ?? {
        workoutId: row.session_workout_id,
        completedAt: row.session_completed_at,
        sets: [],
      };
      const set = workoutSetFromRow(row);
      session.sets.push({
        ...(set.weightKg !== undefined ? { weightKg: set.weightKg } : {}),
        reps: set.reps,
        ...(set.rpe !== undefined ? { rpe: set.rpe } : {}),
      });
      sessions.set(row.session_workout_id, session);
    });
    return [...sessions.values()];
  }

  async getBestSet({
    userId,
    exerciseId,
  }: Parameters<ExerciseHistoryRepository["getBestSet"]>[0]): Promise<WorkoutSet | null> {
    const row = await this.database.getFirstAsync<LocalWorkoutSetRow>(
      `SELECT s.* FROM local_sets s
       JOIN local_workouts w ON w.id=s.workout_id AND w.user_id=s.user_id
       WHERE s.user_id=? AND s.exercise_id=? AND s.set_type='working'
         AND s.deleted_at IS NULL AND w.status='completed'
       ORDER BY COALESCE(s.weight_kg, 0) DESC, s.reps DESC, s.completed_at DESC
       LIMIT 1;`,
      userId,
      exerciseId,
    );
    return row ? workoutSetFromRow(row) : null;
  }
}
