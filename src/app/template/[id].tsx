import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { TemplateDetailScreen } from "@/features/templates/screens/TemplateDetailScreen";
import {
  archiveCurrentUserTemplate,
  duplicateCurrentUserTemplate,
  getCurrentUserTemplate,
} from "@/features/templates/services/templateApplication";
import { useSafeBack } from "@/features/routing/hooks/useSafeBack";

export default function TemplateDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useSafeBack('/workouts');
  const loadTemplate = useCallback(() => getCurrentUserTemplate(id), [id]);
  return (
    <TemplateDetailScreen
      loadTemplate={loadTemplate}
      onArchive={archiveCurrentUserTemplate}
      onArchived={() => router.replace("/workouts")}
      onBack={goBack}
      onDuplicate={duplicateCurrentUserTemplate}
      onDuplicated={(templateId) => router.replace(`/template/${templateId}`)}
      onEdit={(templateId) => router.push(`/template/edit/${templateId}`)}
    />
  );
}
