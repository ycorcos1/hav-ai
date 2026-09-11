import { requireCurrentLocalOwner } from "@/features/routing/localRecovery";
import { loadCurrentUserActiveWorkoutExercise, loadCurrentUserWorkoutOverview,
  type ActiveWorkoutOverview } from "./workoutApplication";
import { createWorkoutPersistence } from "./workoutPersistence";
import { createRecoveryStorage } from "./recoveryStorage";
import { readRecoveryBookmark, writeRecoveryBookmark } from "./recoveryBookmark";

export type RecoveryWorkoutOverview = ActiveWorkoutOverview & { lastActiveWorkoutExerciseId?: string };

export async function loadRecoveryWorkoutOverview(workoutId: string): Promise<RecoveryWorkoutOverview | null> {
  const owner = await requireCurrentLocalOwner();
  const overview = await loadCurrentUserWorkoutOverview(workoutId);
  owner.assertCurrent();
  if (!overview || overview.workout.userId !== owner.userId) return null;
  const { workoutRepository } = await createWorkoutPersistence();
  const activeWorkout = await workoutRepository.getActiveForUser(owner.userId);
  owner.assertCurrent();
  if (!activeWorkout || activeWorkout.id !== workoutId) return overview;
  const lastActiveWorkoutExerciseId = await readRecoveryBookmark(createRecoveryStorage(), owner.userId, activeWorkout);
  owner.assertCurrent();
  return { ...overview, lastActiveWorkoutExerciseId };
}

export async function loadAndRememberActiveExercise(workoutId: string, instanceId: string) {
  const owner = await requireCurrentLocalOwner();
  const exercise = await loadCurrentUserActiveWorkoutExercise(workoutId, instanceId);
  owner.assertCurrent();
  if (!exercise || exercise.workout.userId !== owner.userId) return null;
  const { workoutRepository } = await createWorkoutPersistence();
  const activeWorkout = await workoutRepository.getActiveForUser(owner.userId);
  owner.assertCurrent();
  if (activeWorkout?.id === workoutId) {
    await writeRecoveryBookmark(createRecoveryStorage(), owner.userId, activeWorkout, instanceId);
    owner.assertCurrent();
  }
  return exercise;
}
