import { requireCurrentLocalOwner } from "@/features/routing/localRecovery";
import { createExercisePersistence } from "@/features/exercises/services/exercisePersistence";
import { populateExerciseFixture } from "@/features/exercises/services/populateExerciseFixture";
import { createProfileCachePersistence } from "@/features/profile/services/profileCachePersistence";
import type {
  CompleteSetInput,
  CompleteSetResult,
  EditSetInput,
  Exercise,
  ExerciseSessionPerformance,
  UUID,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutTemplate,
  UserExercisePreference,
  UpdateWorkoutNoteInput,
  UndoSetCompletionResult,
  UserProfile,
} from "@/shared/contracts";

import { CompleteSetService } from "./completeSet";
import { DeleteSetService } from "./deleteSet";
import { EditSetService } from "./editSet";
import { createSetPersistence } from "./setPersistence";
import { StartWorkoutService, type StartWorkoutResult } from "./startWorkout";
import { UndoSetCompletionService } from "./undoSetCompletion";
import { createWorkoutPersistence } from "./workoutPersistence";
import { updateActiveWorkoutNote } from "./workoutNotes";
import { getCachedWorkoutProfile } from "./workoutProfilePreferences";

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
  profile: UserProfile;
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

export async function completeCurrentUserSet(
  input: CompleteSetInput,
): Promise<CompleteSetResult> {
  const owner = await requireCurrentLocalOwner();
  const persistence = await createSetPersistence();
  owner.assertCurrent();
  return new CompleteSetService(persistence).complete(owner.userId, input);
}

export async function editCurrentUserSet(input: EditSetInput): Promise<WorkoutSet> {
  const owner = await requireCurrentLocalOwner();
  const persistence = await createSetPersistence();
  owner.assertCurrent();
  return new EditSetService(persistence).edit(owner.userId, input);
}

export async function deleteCurrentUserSet(setId: UUID): Promise<void> {
  const owner = await requireCurrentLocalOwner();
  const persistence = await createSetPersistence();
  owner.assertCurrent();
  await new DeleteSetService(persistence).delete(owner.userId, setId);
}

export async function undoCurrentUserSetCompletion(
  setId: UUID,
): Promise<UndoSetCompletionResult> {
  const owner = await requireCurrentLocalOwner();
  const persistence = await createSetPersistence();
  owner.assertCurrent();
  return new UndoSetCompletionService(persistence).undo(owner.userId, setId);
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

  const [{ exerciseRepository, preferenceRepository }, { profileCacheRepository }] = await Promise.all([
    createExercisePersistence(),
    createProfileCachePersistence(),
  ]);
  await populateExerciseFixture(exerciseRepository);
  const [exercise, exercisePreference, profile, recentPerformance] = await Promise.all([
    exerciseRepository.getById(userId, workoutExercise.exerciseId),
    preferenceRepository.get(userId, workoutExercise.exerciseId),
    getCachedWorkoutProfile(profileCacheRepository, userId),
    persistence.exerciseHistoryRepository.getRecentSessions({
      userId,
      exerciseId: workoutExercise.exerciseId,
      limit: 1,
    }),
  ]);
  return {
    exercise,
    exercisePreference,
    profile,
    previousPerformance: recentPerformance[0] ?? null,
    workout,
    workoutExercise,
  };
}

async function persistenceForCurrentUser() {
  const owner = await requireCurrentLocalOwner();
  const persistence = await createWorkoutPersistence();
  owner.assertCurrent();
  return { persistence, userId: owner.userId };
}
