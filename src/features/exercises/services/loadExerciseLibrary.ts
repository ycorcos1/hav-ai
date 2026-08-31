import { authService } from '@/lib/supabase/services';
import type { Exercise } from '@/shared/contracts';

import { createExercisePersistence } from './exercisePersistence';
import { populateExerciseFixture } from './populateExerciseFixture';

export async function getExercise(id: string): Promise<Exercise | null> {
  const session = await authService.getSession();
  if (!session) throw new Error('Exercise detail requires an authenticated session.');
  const { exerciseRepository } = await createExercisePersistence();
  await populateExerciseFixture(exerciseRepository);
  return exerciseRepository.getById(session.user.id, id);
}

export async function loadExerciseLibrary(): Promise<Exercise[]> {
  const session = await authService.getSession();

  if (!session) throw new Error('Exercise library requires an authenticated session.');

  const { exerciseRepository } = await createExercisePersistence();
  await populateExerciseFixture(exerciseRepository);
  return exerciseRepository.listAccessible(session.user.id);
}
