import { authService } from '@/lib/supabase/services';
import type { UUID, UserExercisePreference } from '@/shared/contracts';

import { saveExercisePreference, type ExercisePreferencePatch } from './exercisePreferences';
import { createExercisePersistence } from './exercisePersistence';
import { populateExerciseFixture } from './populateExerciseFixture';

async function repositoryForCurrentUser() {
  const session = await authService.getSession();
  if (!session) throw new Error('Exercise preferences require an authenticated session.');
  const persistence = await createExercisePersistence();
  return { ...persistence, userId: session.user.id };
}

export async function loadExercisePreferences(): Promise<UserExercisePreference[]> {
  const { preferenceRepository, userId } = await repositoryForCurrentUser();
  return preferenceRepository.listFavorites(userId);
}

export async function loadExercisePreference(exerciseId: UUID): Promise<UserExercisePreference | null> {
  const { preferenceRepository, userId } = await repositoryForCurrentUser();
  return preferenceRepository.get(userId, exerciseId);
}

export async function updateCurrentUserExercisePreference(exerciseId: UUID, patch: ExercisePreferencePatch): Promise<UserExercisePreference | null> {
  const { exerciseRepository, preferenceRepository, userId } = await repositoryForCurrentUser();
  await populateExerciseFixture(exerciseRepository);
  const exercise = await exerciseRepository.getById(userId, exerciseId);
  if (!exercise) throw new Error('Exercise is not available locally.');
  return saveExercisePreference(preferenceRepository, userId, exercise, patch);
}
