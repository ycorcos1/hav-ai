import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Screen } from '@/components/Screen';
import type { LocalExerciseRepository } from '@/db/repositories/types';
import { CustomExerciseScreen } from '@/features/exercises/screens/CustomExerciseScreen';
import { createExercisePersistence } from '@/features/exercises/services/exercisePersistence';
import { getExercise } from '@/features/exercises/services/loadExerciseLibrary';
import { useSafeBack } from '@/features/routing/hooks/useSafeBack';
import { authService } from '@/lib/supabase/services';
import type { Exercise } from '@/shared/contracts';

export default function EditExerciseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSafeBack(`/exercise/${id}`);
  const [exercise, setExercise] = useState<Exercise>();
  const [repository, setRepository] = useState<LocalExerciseRepository>();
  const [userId, setUserId] = useState<string>();
  useEffect(() => {
    void Promise.all([authService.getSession(), createExercisePersistence(), getExercise(id)]).then(([session, persistence, loaded]) => {
      if (session && loaded) { setUserId(session.user.id); setRepository(persistence.exerciseRepository); setExercise(loaded); }
    });
  }, [id]);
  if (!exercise || !repository || !userId || exercise.isSystem) return <Screen navigationAction={{ onBack: goBack }}>{null}</Screen>;
  return <CustomExerciseScreen existingExercise={exercise} onBack={goBack} onSaved={() => router.replace(`/exercise/${exercise.id}`)} repository={repository} userId={userId} />;
}
