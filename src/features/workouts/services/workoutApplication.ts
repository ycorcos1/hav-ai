import { authService } from "@/lib/supabase/services";
import { createExercisePersistence } from "@/features/exercises/services/exercisePersistence";
import { populateExerciseFixture } from "@/features/exercises/services/populateExerciseFixture";
import type { Exercise, UUID, Workout, WorkoutExercise, WorkoutTemplate } from "@/shared/contracts";

import { StartWorkoutService, type StartWorkoutResult } from "./startWorkout";
import { createWorkoutPersistence } from "./workoutPersistence";

export type WorkoutHomeState = {
  activeWorkout: Workout | null;
  templates: WorkoutTemplate[];
};

export type ActiveWorkoutOverview = {
  exercises: {
    exercise: Exercise | null;
    workoutExercise: WorkoutExercise;
  }[];
  workout: Workout;
};

export async function loadCurrentUserWorkoutHome(): Promise<WorkoutHomeState> {
  const { persistence, userId } = await persistenceForCurrentUser();
  const [activeWorkout, templates] = await Promise.all([
    persistence.workoutRepository.getActiveForUser(userId),
    persistence.templateRepository.listForUser(userId),
  ]);
  return { activeWorkout, templates: templates.filter((template) => !template.isArchived) };
}

export async function requestCurrentUserWorkoutStart(templateId: UUID): Promise<StartWorkoutResult> {
  const { persistence, userId } = await persistenceForCurrentUser();
  return new StartWorkoutService(persistence).requestStartFromTemplate(userId, templateId);
}

export async function discardCurrentUserActiveWorkout(workoutId: UUID): Promise<void> {
  const { persistence, userId } = await persistenceForCurrentUser();
  await new StartWorkoutService(persistence).discardActiveWorkout(userId, workoutId);
}

export async function getCurrentUserActiveWorkout(): Promise<Workout | null> {
  const { persistence, userId } = await persistenceForCurrentUser();
  return persistence.workoutRepository.getActiveForUser(userId);
}

export async function getCurrentUserWorkout(id: UUID): Promise<Workout | null> {
  const { persistence, userId } = await persistenceForCurrentUser();
  return persistence.workoutRepository.getById(userId, id);
}

export async function loadCurrentUserWorkoutOverview(
  id: UUID,
): Promise<ActiveWorkoutOverview | null> {
  const { persistence, userId } = await persistenceForCurrentUser();
  const workout = await persistence.workoutRepository.getById(userId, id);
  if (!workout) return null;

  const { exerciseRepository } = await createExercisePersistence();
  await populateExerciseFixture(exerciseRepository);
  const orderedExercises = [...workout.exercises].sort((left, right) => left.position - right.position);
  const exercises = await Promise.all(orderedExercises.map(async (workoutExercise) => ({
    exercise: await exerciseRepository.getById(userId, workoutExercise.exerciseId),
    workoutExercise,
  })));

  return { exercises, workout };
}

async function persistenceForCurrentUser() {
  const session = await authService.getSession();
  if (!session) throw new Error("Workout sessions require an authenticated session.");
  return { persistence: await createWorkoutPersistence(), userId: session.user.id };
}
