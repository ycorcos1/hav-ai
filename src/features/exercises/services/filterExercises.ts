import type { Exercise, MuscleGroup } from '@/shared/contracts';

export type ExerciseMuscleFilter = 'all' | MuscleGroup;

export const exerciseMuscleFilters: readonly ExerciseMuscleFilter[] = [
  'all',
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];

export function filterExercises(
  exercises: readonly Exercise[],
  query: string,
  muscleFilter: ExerciseMuscleFilter,
): Exercise[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return exercises.filter((exercise) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      exercise.name.toLocaleLowerCase().includes(normalizedQuery);
    const matchesMuscle =
      muscleFilter === 'all' || exercise.primaryMuscleGroup === muscleFilter;

    return matchesQuery && matchesMuscle;
  });
}

export function exerciseMuscleLabel(filter: ExerciseMuscleFilter): string {
  if (filter === 'all') return 'All';

  return filter.charAt(0).toUpperCase() + filter.slice(1);
}
