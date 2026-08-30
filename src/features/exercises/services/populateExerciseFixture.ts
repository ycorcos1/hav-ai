import type { LocalExerciseRepository } from '@/db/repositories';

import { developmentExerciseFixture } from '../fixtures/developmentExerciseFixture';

export async function populateExerciseFixture(
  repository: LocalExerciseRepository,
): Promise<void> {
  for (const exercise of developmentExerciseFixture) {
    await repository.upsert(exercise);
  }
}
