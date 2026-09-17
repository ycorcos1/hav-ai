import type {
  ExerciseHistoryRepository,
  LocalExerciseRepository,
  LocalProfileCacheRepository,
  LocalWorkoutRepository,
} from "@/db/repositories";
import { calculateWorkoutSummary } from "@/features/metrics";
import { generateWorkoutRecommendations } from "@/features/recommendations/services";
import type {
  FinishWorkoutInput,
  FinishWorkoutResult,
  UUID,
  Workout,
} from "@/shared/contracts";

export type FinishWorkoutDependencies = {
  exerciseHistoryRepository: ExerciseHistoryRepository;
  exerciseRepository: LocalExerciseRepository;
  profileCacheRepository: LocalProfileCacheRepository;
  workoutRepository: LocalWorkoutRepository;
};

export class FinishWorkoutError extends Error {
  readonly name = "FinishWorkoutError";
}

export class FinishWorkoutService {
  private finishing = false;

  constructor(private readonly dependencies: FinishWorkoutDependencies) {}

  async finish(
    userId: UUID,
    input: FinishWorkoutInput,
  ): Promise<FinishWorkoutResult> {
    if (this.finishing) throw finishError();
    this.finishing = true;
    try {
      const workout = await this.dependencies.workoutRepository.getById(userId, input.workoutId);
      if (!workout || workout.status !== "active") throw finishError();
      const completedWorkout: Workout = {
        ...workout,
        status: "completed",
        completedAt: input.completedAt,
        updatedAt: input.completedAt,
      };
      const historicalSets = await this.dependencies.exerciseHistoryRepository
        .getCompletedSetsForExercises({
          userId,
          exerciseIds: workout.exercises.map(({ exerciseId }) => exerciseId),
          excludeWorkoutId: workout.id,
        });
      let calculation: ReturnType<typeof calculateWorkoutSummary>;
      try {
        calculation = calculateWorkoutSummary(completedWorkout, historicalSets);
      } catch {
        throw finishError();
      }
      const recommendations = await generateWorkoutRecommendations(
        this.dependencies,
        completedWorkout,
      );
      const summary = {
        ...calculation.summary,
        exerciseSummaries: calculation.summary.exerciseSummaries.map((exerciseSummary) => ({
          ...exerciseSummary,
          nextRecommendation: recommendations.find(
            ({ exerciseId }) => exerciseId === exerciseSummary.exerciseId,
          ),
        })),
      };
      await this.dependencies.workoutRepository.finish(completedWorkout, recommendations);
      return {
        workout: completedWorkout,
        summary,
        recommendations,
        personalRecords: calculation.personalRecords,
      };
    } catch (error) {
      if (error instanceof FinishWorkoutError) throw error;
      throw finishError();
    } finally {
      this.finishing = false;
    }
  }
}

function finishError(): FinishWorkoutError {
  return new FinishWorkoutError("The workout could not be finished.");
}
