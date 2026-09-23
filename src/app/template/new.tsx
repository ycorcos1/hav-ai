import { useRouter } from "expo-router";

import { loadExerciseLibrary } from "@/features/exercises/services/loadExerciseLibrary";
import { loadExercisePreferences } from "@/features/exercises/services/loadExercisePreferences";
import { NewTemplateFlowScreen } from "@/features/templates/screens/NewTemplateFlowScreen";
import { createCurrentUserTemplate } from "@/features/templates/services/templateApplication";
import { useSafeBack } from "@/features/routing/hooks/useSafeBack";

export default function NewTemplateRoute() {
  const router = useRouter();
  const goBack = useSafeBack('/workouts');
  return (
    <NewTemplateFlowScreen
      loadExercises={loadExerciseLibrary}
      loadPreferences={loadExercisePreferences}
      onBack={goBack}
      onSave={createCurrentUserTemplate}
      onSaved={(id) => router.replace(`/template/${id}`)}
    />
  );
}
