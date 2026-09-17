import type {
  ExerciseHistoryRepository,
  LocalRecommendationRepository,
  WorkoutHistoryRepository,
} from "@/db/repositories";
import { calculateLocalPersonalRecordState, type LocalPersonalRecordState } from "@/features/metrics";
import {
  generateExerciseRecommendation,
  type GenerateWorkoutRecommendationsDependencies,
} from "@/features/recommendations/services";
import type {
  EditSetInput,
  ProgressionRecommendation,
  UUID,
  WorkoutSet,
} from "@/shared/contracts";

import type { HistoricalWorkoutPersistence } from "./historicalWorkoutPersistenceTypes";
import type { SetPersistence } from "./setPersistenceTypes";
import { normalizeSetNote, validateSetValues } from "./setValidation";

export type HistoricalSetEditResult = {
  personalRecordState: LocalPersonalRecordState;
  recommendation: ProgressionRecommendation | null;
  set: WorkoutSet;
};

export type HistoricalWorkoutDeleteOutcome = {
  affectedExerciseIds: UUID[];
  personalRecordStateByExercise: Readonly<Record<UUID, LocalPersonalRecordState>>;
};

type Dependencies = GenerateWorkoutRecommendationsDependencies & {
  exerciseHistoryRepository: ExerciseHistoryRepository;
  historicalWorkoutPersistence: HistoricalWorkoutPersistence;
  recommendationRepository: LocalRecommendationRepository;
  setPersistence: SetPersistence;
  workoutHistoryRepository: WorkoutHistoryRepository;
};

export class HistoricalWorkoutMutationError extends Error {
  readonly name = "HistoricalWorkoutMutationError";
}

export class HistoricalWorkoutMutationService {
  constructor(
    private readonly dependencies: Dependencies,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async editSet(userId: UUID, input: EditSetInput): Promise<HistoricalSetEditResult> {
    try {
      validateSetValues(input);
    } catch (error: unknown) {
      throw new HistoricalWorkoutMutationError(
        error instanceof Error ? error.message : "Set values are invalid.",
      );
    }
    const existing = await this.dependencies.setPersistence.setRepository.getById(userId, input.setId);
    if (!existing) throw mutationError();
    const workout = await this.dependencies.setPersistence.workoutRepository.getById(
      userId,
      existing.workoutId,
    );
    const workoutExercise = workout?.exercises.find(({ id }) => id === existing.workoutExerciseId);
    if (
      !workout
      || workout.status !== "completed"
      || !workoutExercise
      || workoutExercise.exerciseId !== existing.exerciseId
    ) throw mutationError();

    const notes = Object.prototype.hasOwnProperty.call(input, "notes")
      ? normalizeSetNote(input.notes)
      : existing.notes;
    const set: WorkoutSet = {
      ...existing,
      ...(input.weightKg === undefined ? { weightKg: undefined } : { weightKg: input.weightKg }),
      reps: input.reps,
      ...(input.rpe === undefined ? { rpe: undefined } : { rpe: input.rpe }),
      ...(notes === undefined ? { notes: undefined } : { notes }),
      updatedAt: this.now(),
    };
    await this.dependencies.setPersistence.commitEditedSet(set);
    const derived = await this.recalculateExercise(userId, set.exerciseId);
    return { ...derived, set };
  }

  async deleteWorkout(
    userId: UUID,
    workoutId: UUID,
  ): Promise<HistoricalWorkoutDeleteOutcome> {
    const workout = await this.dependencies.setPersistence.workoutRepository.getById(userId, workoutId);
    if (!workout || workout.status !== "completed") throw mutationError();
    const deletion = await this.dependencies.historicalWorkoutPersistence.deleteCompletedWorkout(
      userId,
      workoutId,
      this.now(),
    );
    if (deletion.status === "missing") throw mutationError();
    const personalRecordStateByExercise: Record<UUID, LocalPersonalRecordState> = {};
    for (const exerciseId of deletion.exerciseIds) {
      const derived = await this.recalculateExercise(userId, exerciseId);
      personalRecordStateByExercise[exerciseId] = derived.personalRecordState;
    }
    return { affectedExerciseIds: deletion.exerciseIds, personalRecordStateByExercise };
  }

  private async recalculateExercise(userId: UUID, exerciseId: UUID): Promise<{
    personalRecordState: LocalPersonalRecordState;
    recommendation: ProgressionRecommendation | null;
  }> {
    const sets = await this.dependencies.exerciseHistoryRepository.getCompletedSetsForExercises({
      userId,
      exerciseIds: [exerciseId],
    });
    const personalRecordState = calculateLocalPersonalRecordState([], sets);
    const latestWorkout = await this.dependencies.workoutHistoryRepository
      .getLatestCompletedForExercise(userId, exerciseId);
    const latestExercise = latestWorkout?.exercises.find((item) => item.exerciseId === exerciseId);
    const recommendation = latestWorkout && latestExercise
      ? await generateExerciseRecommendation(this.dependencies, latestWorkout, latestExercise)
      : null;
    if (recommendation) {
      await this.dependencies.recommendationRepository.upsert(recommendation);
    } else {
      const active = await this.dependencies.recommendationRepository
        .getActiveForExercise(userId, exerciseId);
      if (active) await this.dependencies.recommendationRepository.supersede(userId, active.id);
    }
    return { personalRecordState, recommendation };
  }
}

function mutationError(): HistoricalWorkoutMutationError {
  return new HistoricalWorkoutMutationError("The historical workout could not be updated.");
}
