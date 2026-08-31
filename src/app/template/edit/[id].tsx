import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { loadExerciseLibrary } from "@/features/exercises/services/loadExerciseLibrary";
import { loadExercisePreferences } from "@/features/exercises/services/loadExercisePreferences";
import { EditTemplateScreen } from "@/features/templates/screens/EditTemplateScreen";
import { editCurrentUserTemplate, getCurrentUserTemplate } from "@/features/templates/services/templateApplication";

export default function EditTemplateRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loadTemplate = useCallback(() => getCurrentUserTemplate(id), [id]);
  return (
    <EditTemplateScreen
      loadExercises={loadExerciseLibrary}
      loadPreferences={loadExercisePreferences}
      loadTemplate={loadTemplate}
      onSave={(input) => editCurrentUserTemplate(id, input)}
      onSaved={(templateId) => router.replace(`/template/${templateId}`)}
    />
  );
}
