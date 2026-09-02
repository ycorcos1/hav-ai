import { authService } from "@/lib/supabase/services";
import { createExercisePersistence } from "@/features/exercises/services/exercisePersistence";
import { populateExerciseFixture } from "@/features/exercises/services/populateExerciseFixture";
import type {
  Exercise,
  ExerciseSessionPerformance,
  UUID,
  Workout,
  WorkoutExercise,
  WorkoutTemplate,
  UserExercisePreference,
  UpdateWorkoutNoteInput,
} from "@/shared/contracts";

import { StartWorkoutService, type StartWorkoutResult } from "./startWorkout";
import { createWorkoutPersistence } from "./workoutPersistence";
import { updateActiveWorkoutNote } from "./workoutNotes";

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

export type ActiveWorkoutExercise = {
  exercise: Exercise | null;
  exercisePreference: UserExercisePreference | null;
  previousPerformance: ExerciseSessionPerformance | null;
  workout: Workout;
  workoutExercise: WorkoutExercise;
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

export async function updateCurrentUserActiveWorkoutNote(
  input: UpdateWorkoutNoteInput,
): Promise<Workout> {
  const { persistence, userId } = await persistenceForCurrentUser();
  return updateActiveWorkoutNote(persistence.workoutRepository, userId, input);
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

export async function loadCurrentUserActiveWorkoutExercise(
  workoutId: UUID,
  workoutExerciseId: UUID,
): Promise<ActiveWorkoutExercise | null> {
  const { persistence, userId } = await persistenceForCurrentUser();
  const workout = await persistence.workoutRepository.getById(userId, workoutId);
  if (!workout || workout.status !== "active") return null;

  const workoutExercise = workout.exercises.find(({ id }) => id === workoutExerciseId);
  if (!workoutExercise) return null;

  const { exerciseRepository, preferenceRepository } = await createExercisePersistence();
  await populateExerciseFixture(exerciseRepository);
  const [exercise, exercisePreference, recentPerformance] = await Promise.all([
    exerciseRepository.getById(userId, workoutExercise.exerciseId),
    preferenceRepository.get(userId, workoutExercise.exerciseId),
    persistence.exerciseHistoryRepository.getRecentSessions({
      userId,
      exerciseId: workoutExercise.exerciseId,
      limit: 1,
    }),
  ]);
  return {
    exercise,
    exercisePreference,
    previousPerformance: recentPerformance[0] ?? null,
    workout,
    workoutExercise,
  };
}

async function persistenceForCurrentUser() {
  const session = await authService.getSession();
  if (!session) throw new Error("Workout sessions require an authenticated session.");
  return { persistence: await createWorkoutPersistence(), userId: session.user.id };
}
