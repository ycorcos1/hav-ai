import type { LocalExerciseRepository } from '@/db/repositories';
import { developmentExerciseFixture } from '@/features/exercises/fixtures/developmentExerciseFixture';
import { populateExerciseFixture } from '@/features/exercises/services/populateExerciseFixture';

describe('populateExerciseFixture', () => {
  it('upserts the stable system fixture through LocalExerciseRepository', async () => {
    const repository: jest.Mocked<LocalExerciseRepository> = {
      getById: jest.fn(),
      listAccessible: jest.fn(),
      search: jest.fn(),
      upsert: jest.fn(),
      archiveCustomExercise: jest.fn(),
    };

    await populateExerciseFixture(repository);

    expect(developmentExerciseFixture).toHaveLength(24);
    expect(developmentExerciseFixture.every((exercise) => exercise.isSystem)).toBe(true);
    expect(new Set(developmentExerciseFixture.map((exercise) => exercise.id)).size).toBe(24);
    expect(repository.upsert).toHaveBeenCalledTimes(24);
    expect(repository.upsert).toHaveBeenNthCalledWith(1, developmentExerciseFixture[0]);
  });
});
