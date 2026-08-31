import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import type { LocalExerciseRepository } from '@/db/repositories/types';
import { CustomExerciseScreen } from '@/features/exercises/screens/CustomExerciseScreen';
import { createExercisePersistence } from '@/features/exercises/services/exercisePersistence';
import { authService } from '@/lib/supabase/services';

export default function CreateExerciseRoute() {
  const router = useRouter();
  return <CreateExerciseContent onSaved={(id) => router.replace(`/exercise/${id}`)} />;
}

function CreateExerciseContent({ onSaved }: { onSaved: (id: string) => void }) {
  const [repository, setRepository] = useState<LocalExerciseRepository>();
  const [userId, setUserId] = useState<string>();
  useEffect(() => { void Promise.all([authService.getSession(), createExercisePersistence()]).then(([session, persistence]) => { if (session) { setUserId(session.user.id); setRepository(persistence.exerciseRepository); } }); }, []);
  if (!repository || !userId) return null;
  return <CustomExerciseScreen onSaved={onSaved} repository={repository} userId={userId} />;
}
