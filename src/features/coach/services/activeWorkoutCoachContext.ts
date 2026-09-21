import type { ActiveWorkoutExercise } from "@/features/workouts/services/workoutApplication";
import type { CoachRequestV1 } from "@/shared/contracts";

export type ActiveWorkoutCoachContext = NonNullable<CoachRequestV1["context"]>;

export function buildActiveWorkoutCoachContext(
  activeExercise: ActiveWorkoutExercise,
): ActiveWorkoutCoachContext {
  const { exercisePreference, workout, workoutExercise } = activeExercise;
  const hasCompleteTarget = workoutExercise.targetSets !== undefined
    && workoutExercise.targetMinReps !== undefined
    && workoutExercise.targetMaxReps !== undefined;

  return {
    activeWorkoutId: workout.id,
    activeExerciseId: workoutExercise.exerciseId,
    localCurrentSession: {
      workoutId: workout.id,
      exerciseId: workoutExercise.exerciseId,
      ...(hasCompleteTarget ? {
        currentTarget: {
          ...(workoutExercise.targetWeightKg === undefined
            ? {}
            : { weightKg: workoutExercise.targetWeightKg }),
          minReps: workoutExercise.targetMinReps!,
          maxReps: workoutExercise.targetMaxReps!,
          targetSets: workoutExercise.targetSets!,
        },
      } : {}),
      completedSets: [...workoutExercise.sets]
        .sort((left, right) => left.position - right.position)
        .map(({ notes, reps, rpe, weightKg }) => ({
          ...(weightKg === undefined ? {} : { weightKg }),
          reps,
          ...(rpe === undefined ? {} : { rpe }),
          ...(notes === undefined ? {} : { notes }),
        })),
      ...(workout.notes === undefined ? {} : { workoutNotes: workout.notes }),
      ...(exercisePreference?.notes
        ? { exercisePreferenceNotes: exercisePreference.notes }
        : {}),
    },
  };
}
