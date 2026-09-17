import { useRouter } from "expo-router";

import { ProgressScreen } from '@/features/progress/screens/ProgressScreen';
import { loadCurrentUserProgressHome } from "@/features/progress/services/progressApplication";

export default function ProgressRoute() {
  const router = useRouter();
  return (
    <ProgressScreen
      loadProgress={loadCurrentUserProgressHome}
      onOpenExercise={(id) => router.push(`/progress/${id}`)}
    />
  );
}
