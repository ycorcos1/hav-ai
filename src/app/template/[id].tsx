import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

import { TemplateDetailScreen } from "@/features/templates/screens/TemplateDetailScreen";
import { getCurrentUserTemplate } from "@/features/templates/services/templateApplication";

export default function TemplateDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loadTemplate = useCallback(() => getCurrentUserTemplate(id), [id]);
  return <TemplateDetailScreen loadTemplate={loadTemplate} />;
}
