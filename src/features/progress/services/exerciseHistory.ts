import type { ExerciseHistoryRepository } from "@/db/repositories";
import type { ExerciseSessionPerformance, UUID } from "@/shared/contracts";

export class ExerciseHistoryService {
  constructor(private readonly repository: ExerciseHistoryRepository) {}

  async getRecentSessions(params: {
    exerciseId: UUID;
    limit: number;
    userId: UUID;
  }): Promise<ExerciseSessionPerformance[]> {
    if (!Number.isInteger(params.limit) || params.limit <= 0) return [];
    const sessions = await this.repository.getRecentSessions(params);
    return sessions
      .filter(({ completedAt, sets }) => (
        Number.isFinite(new Date(completedAt).getTime())
        && sets.some(({ reps }) => Number.isInteger(reps) && reps > 0)
      ))
      .map((session) => ({
        ...session,
        sets: session.sets.filter(({ reps }) => Number.isInteger(reps) && reps > 0),
      }))
      .sort((left, right) => (
        right.completedAt.localeCompare(left.completedAt)
        || right.workoutId.localeCompare(left.workoutId)
      ))
      .slice(0, params.limit);
  }
}
