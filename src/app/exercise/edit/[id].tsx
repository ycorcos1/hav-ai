import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { bootstrapLocalDatabase } from '@/db';
import { SQLiteLocalExerciseRepository } from '@/db/repositories';
import { CustomExerciseScreen } from '@/features/exercises/screens/CustomExerciseScreen';
import { getExercise } from '@/features/exercises/services/loadExerciseLibrary';
import { authService } from '@/lib/supabase/services';
import type { Exercise } from '@/shared/contracts';

export default function EditExerciseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise>();
  const [repository, setRepository] = useState<SQLiteLocalExerciseRepository>();
  const [userId, setUserId] = useState<string>();
  useEffect(() => {
    void Promise.all([authService.getSession(), bootstrapLocalDatabase(), getExercise(id)]).then(([session, database, loaded]) => {
      if (session && loaded) { setUserId(session.user.id); setRepository(new SQLiteLocalExerciseRepository(database)); setExercise(loaded); }
    });
  }, [id]);
  if (!exercise || !repository || !userId || exercise.isSystem) return null;
  return <CustomExerciseScreen existingExercise={exercise} onSaved={() => router.replace(`/exercise/${exercise.id}`)} repository={repository} userId={userId} />;
}
