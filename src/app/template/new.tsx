import { useRouter } from "expo-router";

import { loadExerciseLibrary } from "@/features/exercises/services/loadExerciseLibrary";
import { loadExercisePreferences } from "@/features/exercises/services/loadExercisePreferences";
import { NewTemplateFlowScreen } from "@/features/templates/screens/NewTemplateFlowScreen";
import { createCurrentUserTemplate } from "@/features/templates/services/templateApplication";

export default function NewTemplateRoute() {
  const router = useRouter();
  return (
    <NewTemplateFlowScreen
      loadExercises={loadExerciseLibrary}
      loadPreferences={loadExercisePreferences}
      onSave={createCurrentUserTemplate}
      onSaved={(id) => router.replace(`/template/${id}`)}
    />
  );
}
