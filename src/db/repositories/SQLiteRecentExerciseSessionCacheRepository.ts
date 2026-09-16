import type { CachedRecentExerciseSession, RecentExerciseSessionCacheRepository } from "./types";
import type { TransactionalLocalDatabaseConnection } from "../types";

export class SQLiteRecentExerciseSessionCacheRepository
implements RecentExerciseSessionCacheRepository {
  constructor(private readonly database: TransactionalLocalDatabaseConnection) {}

  async replaceForUser(
    userId: string,
    sessions: CachedRecentExerciseSession[],
    limitPerExercise: number,
  ): Promise<number> {
    if (sessions.some((session) => session.userId !== userId)) {
      throw new Error("Recent exercise session cache is not accessible to its user.");
    }
    const retained = retainRecentSessions(sessions, limitPerExercise);
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        "DELETE FROM cached_recent_exercise_sessions WHERE user_id=?;",
        userId,
      );
      for (const session of retained) {
        await transaction.runAsync(
          `INSERT INTO cached_recent_exercise_sessions (
            id, user_id, exercise_id, workout_id, completed_at,
            target_sets, target_min_reps, target_max_reps,
            working_sets_json, server_updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          session.id,
          session.userId,
          session.exerciseId,
          session.workoutId,
          session.completedAt,
          session.targetSets ?? null,
          session.targetMinReps ?? null,
          session.targetMaxReps ?? null,
          JSON.stringify(session.workingSets),
          session.serverUpdatedAt ?? null,
        );
      }
    });
    return retained.length;
  }
}

function retainRecentSessions(
  sessions: CachedRecentExerciseSession[],
  limitPerExercise: number,
): CachedRecentExerciseSession[] {
  if (limitPerExercise <= 0) return [];
  const counts = new Map<string, number>();
  const retainedSessionKeys = new Set<string>();
  return [...sessions]
    .sort((left, right) => (
      right.completedAt.localeCompare(left.completedAt) || left.id.localeCompare(right.id)
    ))
    .filter((session) => {
      const sessionKey = `${session.exerciseId}:${session.workoutId}`;
      if (retainedSessionKeys.has(sessionKey)) return true;
      const count = counts.get(session.exerciseId) ?? 0;
      if (count >= limitPerExercise) return false;
      counts.set(session.exerciseId, count + 1);
      retainedSessionKeys.add(sessionKey);
      return true;
    });
}
