import { useLocalSearchParams, useRouter } from 'expo-router';

import { ExerciseDetailScreen } from '@/features/exercises/screens/ExerciseDetailScreen';
import { archiveCustomExercise } from '@/features/exercises/services/customExercises';
import { getExercise } from '@/features/exercises/services/loadExerciseLibrary';
import { loadExercisePreference, updateCurrentUserExercisePreference } from '@/features/exercises/services/loadExercisePreferences';
import { createExercisePersistence } from '@/features/exercises/services/exercisePersistence';
import { authService } from '@/lib/supabase/services';

export default function ExerciseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return <ExerciseDetailScreen exerciseId={id} loadExercise={getExercise} loadPreference={loadExercisePreference} updatePreference={(patch) => updateCurrentUserExercisePreference(id, patch).then(() => undefined)} onEdit={(exerciseId) => router.push(`/exercise/edit/${exerciseId}`)} onArchive={async (exerciseId) => {
    const session = await authService.getSession();
    if (!session) throw new Error('An authenticated session is required.');
    const { exerciseRepository } = await createExercisePersistence();
    await archiveCustomExercise(exerciseRepository, session.user.id, exerciseId);
    router.back();
  }} />;
}
