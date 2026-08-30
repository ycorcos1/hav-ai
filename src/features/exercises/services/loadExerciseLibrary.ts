import { bootstrapLocalDatabase } from '@/db';
import { SQLiteLocalExerciseRepository } from '@/db/repositories';
import { authService } from '@/lib/supabase/services';
import type { Exercise } from '@/shared/contracts';

import { populateExerciseFixture } from './populateExerciseFixture';

export async function loadExerciseLibrary(): Promise<Exercise[]> {
  const session = await authService.getSession();

  if (!session) throw new Error('Exercise library requires an authenticated session.');

  const database = await bootstrapLocalDatabase();
  const repository = new SQLiteLocalExerciseRepository(database);

  await populateExerciseFixture(repository);

  return repository.listAccessible(session.user.id);
}
