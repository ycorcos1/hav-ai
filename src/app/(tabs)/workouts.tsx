import { useRouter } from 'expo-router';

import { listCurrentUserTemplates } from '@/features/templates/services/templateApplication';
import { WorkoutsScreen } from '@/features/workouts/screens/WorkoutsScreen';

export default function WorkoutsRoute() {
  const router = useRouter();
  return (
    <WorkoutsScreen
      loadTemplates={listCurrentUserTemplates}
      onCreate={() => router.push('/template/new')}
      onOpen={(id) => router.push(`/template/${id}`)}
    />
  );
}
