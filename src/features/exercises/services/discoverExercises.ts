import type { Exercise } from '@/shared/contracts';

export type DiscoverySection = 'all' | 'popular' | 'favorites';

export function discoverExercises(
  exercises: Exercise[],
  favoriteIds: ReadonlySet<string>,
  section: DiscoverySection,
  query: string,
  muscle: string,
): Exercise[] {
  const normalizedQuery = query.trim().toLowerCase();
  return exercises.filter((exercise) => {
    if (section === 'popular' && (!exercise.isSystem || exercises.indexOf(exercise) >= 6)) return false;
    if (section === 'favorites' && !favoriteIds.has(exercise.id)) return false;
    if (muscle !== 'all' && exercise.primaryMuscleGroup !== muscle) return false;
    return !normalizedQuery || exercise.name.toLowerCase().includes(normalizedQuery);
  });
}
