import { useLocalSearchParams, useRouter } from 'expo-router';

import { ExerciseDetailScreen } from '@/features/exercises/screens/ExerciseDetailScreen';
import { archiveCustomExercise } from '@/features/exercises/services/customExercises';
import { getExercise } from '@/features/exercises/services/loadExerciseLibrary';
import { bootstrapLocalDatabase } from '@/db';
import { SQLiteLocalExerciseRepository } from '@/db/repositories';
import { authService } from '@/lib/supabase/services';

export default function ExerciseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return <ExerciseDetailScreen exerciseId={id} loadExercise={getExercise} onEdit={(exerciseId) => router.push(`/exercise/edit/${exerciseId}`)} onArchive={async (exerciseId) => {
    const session = await authService.getSession();
    if (!session) throw new Error('An authenticated session is required.');
    const database = await bootstrapLocalDatabase();
    await archiveCustomExercise(new SQLiteLocalExerciseRepository(database), session.user.id, exerciseId);
    router.back();
  }} />;
}
