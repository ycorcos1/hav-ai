import type {
  DetectedPersonalRecord,
  ExerciseWorkoutSummary,
  Workout,
  WorkoutSet,
  WorkoutSummary,
} from "@/shared/contracts";

import { detectPersonalRecords } from "./personalRecords";
import {
  calculateSessionDelta,
  calculateTotalReps,
  calculateWorkingSetCount,
} from "./workoutMetrics";

export type WorkoutSummaryCalculation = {
  personalRecords: DetectedPersonalRecord[];
  summary: WorkoutSummary;
};

export class WorkoutSummaryCalculationError extends Error {
  constructor() {
    super("A completed workout is required to calculate its summary.");
    this.name = "WorkoutSummaryCalculationError";
  }
}

export function calculateWorkoutSummary(
  workout: Workout,
  historicalSets: readonly WorkoutSet[] = [],
): WorkoutSummaryCalculation {
  const durationSeconds = calculateDurationSeconds(workout);
  const currentSets = workout.exercises.flatMap(({ sets }) => sets);
  const eligibleHistory = historicalSets.filter((set) => (
    set.userId === workout.userId && set.workoutId !== workout.id
  ));
  const personalRecords = detectPersonalRecords(currentSets, eligibleHistory);
  const exerciseGroups = groupWorkoutExercises(workout);

  return {
    personalRecords,
    summary: {
      workoutId: workout.id,
      durationSeconds,
      exerciseCount: exerciseGroups.length,
      workingSetCount: calculateWorkingSetCount(currentSets),
      exerciseSummaries: exerciseGroups.map(({ exerciseId, sets }) => {
        const previousSets = mostRecentExerciseSession(eligibleHistory, exerciseId);
        const delta = previousSets === undefined
          ? undefined
          : calculateSessionDelta(sets, previousSets);
        const bestSet = selectBestWorkingSet(sets);
        const detectedPRs = personalRecords
          .filter((record) => record.exerciseId === exerciseId)
          .map(({ type }) => type);
        return {
          exerciseId,
          totalWorkingSets: calculateWorkingSetCount(sets),
          totalReps: calculateTotalReps(sets),
          ...(delta === undefined
            ? {}
            : {
              previousTotalReps: delta.previousTotalReps,
              repDelta: delta.repDelta,
            }),
          ...(bestSet === undefined
            ? {}
            : {
              bestSet: {
                ...(bestSet.weightKg === undefined ? {} : { weightKg: bestSet.weightKg }),
                reps: bestSet.reps,
                ...(bestSet.rpe === undefined ? {} : { rpe: bestSet.rpe }),
              },
            }),
          detectedPRs,
        } satisfies ExerciseWorkoutSummary;
      }),
    },
  };
}

function calculateDurationSeconds(workout: Workout): number {
  if (workout.completedAt === undefined) throw new WorkoutSummaryCalculationError();
  const startedAt = Date.parse(workout.startedAt);
  const completedAt = Date.parse(workout.completedAt);
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
    throw new WorkoutSummaryCalculationError();
  }
  return Math.floor((completedAt - startedAt) / 1000);
}

function groupWorkoutExercises(workout: Workout): {
  exerciseId: string;
  position: number;
  sets: WorkoutSet[];
}[] {
  const groups = new Map<string, { position: number; sets: WorkoutSet[] }>();
  [...workout.exercises]
    .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
    .forEach((exercise) => {
      const existing = groups.get(exercise.exerciseId);
      groups.set(exercise.exerciseId, {
        position: existing?.position ?? exercise.position,
        sets: [...(existing?.sets ?? []), ...exercise.sets],
      });
    });
  return [...groups.entries()]
    .map(([exerciseId, group]) => ({ exerciseId, ...group }))
    .sort((left, right) => left.position - right.position || left.exerciseId.localeCompare(right.exerciseId));
}

function mostRecentExerciseSession(
  historicalSets: readonly WorkoutSet[],
  exerciseId: string,
): WorkoutSet[] | undefined {
  const byWorkout = new Map<string, WorkoutSet[]>();
  historicalSets
    .filter((set) => set.exerciseId === exerciseId)
    .forEach((set) => byWorkout.set(set.workoutId, [
      ...(byWorkout.get(set.workoutId) ?? []),
      set,
    ]));
  return [...byWorkout.values()].sort((left, right) => {
    const leftTime = Math.max(...left.map(({ completedAt }) => Date.parse(completedAt)));
    const rightTime = Math.max(...right.map(({ completedAt }) => Date.parse(completedAt)));
    return rightTime - leftTime || left[0].workoutId.localeCompare(right[0].workoutId);
  })[0];
}

function selectBestWorkingSet(sets: readonly WorkoutSet[]): WorkoutSet | undefined {
  return sets
    .filter(({ reps, setType }) => setType === "working" && reps > 0)
    .sort((left, right) => (
      (right.weightKg ?? 0) - (left.weightKg ?? 0)
      || right.reps - left.reps
      || left.completedAt.localeCompare(right.completedAt)
      || left.id.localeCompare(right.id)
    ))[0];
}
