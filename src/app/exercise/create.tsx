import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { Screen } from '@/components/Screen';
import type { LocalExerciseRepository } from '@/db/repositories/types';
import { CustomExerciseScreen } from '@/features/exercises/screens/CustomExerciseScreen';
import { createExercisePersistence } from '@/features/exercises/services/exercisePersistence';
import { useSafeBack } from '@/features/routing/hooks/useSafeBack';
import { authService } from '@/lib/supabase/services';

export default function CreateExerciseRoute() {
  const router = useRouter();
  const goBack = useSafeBack('/exercise');
  return <CreateExerciseContent onBack={goBack} onSaved={(id) => router.replace(`/exercise/${id}`)} />;
}

function CreateExerciseContent({ onBack, onSaved }: { onBack: () => void; onSaved: (id: string) => void }) {
  const [repository, setRepository] = useState<LocalExerciseRepository>();
  const [userId, setUserId] = useState<string>();
  useEffect(() => { void Promise.all([authService.getSession(), createExercisePersistence()]).then(([session, persistence]) => { if (session) { setUserId(session.user.id); setRepository(persistence.exerciseRepository); } }); }, []);
  if (!repository || !userId) return <Screen navigationAction={{ onBack }}>{null}</Screen>;
  return <CustomExerciseScreen onBack={onBack} onSaved={onSaved} repository={repository} userId={userId} />;
}
