import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { bootstrapLocalDatabase } from '@/db';
import { SQLiteLocalExerciseRepository } from '@/db/repositories';
import { CustomExerciseScreen } from '@/features/exercises/screens/CustomExerciseScreen';
import { authService } from '@/lib/supabase/services';

export default function CreateExerciseRoute() {
  const router = useRouter();
  return <CreateExerciseContent onSaved={(id) => router.replace(`/exercise/${id}`)} />;
}

function CreateExerciseContent({ onSaved }: { onSaved: (id: string) => void }) {
  const [repository, setRepository] = useState<SQLiteLocalExerciseRepository>();
  const [userId, setUserId] = useState<string>();
  useEffect(() => { void Promise.all([authService.getSession(), bootstrapLocalDatabase()]).then(([session, database]) => { if (session) { setUserId(session.user.id); setRepository(new SQLiteLocalExerciseRepository(database)); } }); }, []);
  if (!repository || !userId) return null;
  return <CustomExerciseScreen onSaved={onSaved} repository={repository} userId={userId} />;
}
