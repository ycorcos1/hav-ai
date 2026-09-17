import { populateExerciseFixture } from "@/features/exercises/services/populateExerciseFixture";
import { calculateLocalPersonalRecordState } from "@/features/metrics";
import { requireCurrentLocalOwner } from "@/features/routing/localRecovery";
import { createWorkoutPersistence } from "@/features/workouts/services/workoutPersistence";
import type {
  DetectedPersonalRecord,
  Exercise,
  ExerciseSessionPerformance,
  UUID,
  WeightUnit,
} from "@/shared/contracts";

import { ExerciseHistoryService } from "./exerciseHistory";
import {
  calculateExerciseProgressMetrics,
  type ExerciseProgressMetrics,
} from "./progressMetrics";

export type ProgressRecord = { exercise: Exercise; record: DetectedPersonalRecord };

export type ProgressHome = {
  exercises: Exercise[];
  recentRecords: ProgressRecord[];
  weightUnit: WeightUnit;
};

export type ExerciseProgress = {
  exercise: Exercise;
  metrics: ExerciseProgressMetrics;
  sessions: ExerciseSessionPerformance[];
  weightUnit: WeightUnit;
};

export async function loadCurrentUserProgressHome(): Promise<ProgressHome> {
  const owner = await requireCurrentLocalOwner();
  const persistence = await createWorkoutPersistence();
  owner.assertCurrent();
  await populateExerciseFixture(persistence.exerciseRepository);
  const exercises = (await persistence.exerciseRepository.listAccessible(owner.userId))
    .filter(({ isArchived }) => !isArchived)
    .sort((left, right) => left.name.localeCompare(right.name));
  const sets = await persistence.progressHistoryRepository.getCurrentPersonalRecordCandidates({
    userId: owner.userId,
    exerciseIds: exercises.map(({ id }) => id),
  });
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const recentRecords = calculateLocalPersonalRecordState([], sets).persistedState
    .flatMap((record) => {
      const exercise = exerciseById.get(record.exerciseId);
      return exercise ? [{ exercise, record }] : [];
    })
    .sort((left, right) => (
      right.record.achievedAt.localeCompare(left.record.achievedAt)
      || left.exercise.name.localeCompare(right.exercise.name)
      || left.record.type.localeCompare(right.record.type)
    ))
    .slice(0, 5);
  const profile = await persistence.profileCacheRepository.get(owner.userId);
  return { exercises, recentRecords, weightUnit: profile?.weightUnit ?? "kg" };
}

export async function loadCurrentUserExerciseProgress(
  exerciseId: UUID,
  limit = 20,
): Promise<ExerciseProgress | null> {
  const owner = await requireCurrentLocalOwner();
  const persistence = await createWorkoutPersistence();
  owner.assertCurrent();
  await populateExerciseFixture(persistence.exerciseRepository);
  const exercise = await persistence.exerciseRepository.getById(owner.userId, exerciseId);
  if (!exercise || exercise.isArchived) return null;
  const [sessions, bestWeightSet, bestEstimatedOneRepMaxSet] = await Promise.all([
    new ExerciseHistoryService(persistence.exerciseHistoryRepository)
      .getRecentSessions({ userId: owner.userId, exerciseId, limit }),
    persistence.exerciseHistoryRepository.getBestSet({ userId: owner.userId, exerciseId }),
    persistence.progressHistoryRepository.getBestEstimatedOneRepMaxSet({
      userId: owner.userId,
      exerciseId,
    }),
  ]);
  const profile = await persistence.profileCacheRepository.get(owner.userId);
  return {
    exercise,
    sessions,
    metrics: calculateExerciseProgressMetrics(sessions, {
      ...(bestWeightSet ? { bestWeightSet } : {}),
      ...(bestEstimatedOneRepMaxSet ? { bestEstimatedOneRepMaxSet } : {}),
    }),
    weightUnit: profile?.weightUnit ?? "kg",
  };
}
