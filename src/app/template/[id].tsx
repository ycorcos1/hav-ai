import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";

import { TemplateDetailScreen } from "@/features/templates/screens/TemplateDetailScreen";
import {
  archiveCurrentUserTemplate,
  duplicateCurrentUserTemplate,
  getCurrentUserTemplate,
} from "@/features/templates/services/templateApplication";

export default function TemplateDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const loadTemplate = useCallback(() => getCurrentUserTemplate(id), [id]);
  return (
    <TemplateDetailScreen
      loadTemplate={loadTemplate}
      onArchive={archiveCurrentUserTemplate}
      onArchived={() => router.replace("/workouts")}
      onDuplicate={duplicateCurrentUserTemplate}
      onDuplicated={(templateId) => router.replace(`/template/${templateId}`)}
      onEdit={(templateId) => router.push(`/template/edit/${templateId}`)}
    />
  );
}
