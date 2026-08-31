import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";

import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { NewTemplateFlowScreen } from "@/features/templates/screens/NewTemplateFlowScreen";
import type { TemplateDetail } from "@/features/templates/services/templateApplication";
import type { SaveTemplateInput } from "@/features/templates/services/templateService";
import type { Exercise, UserExercisePreference, WorkoutTemplate } from "@/shared/contracts";
import { colors } from "@/theme";

export type EditTemplateScreenProps = {
  loadExercises: () => Promise<Exercise[]>;
  loadPreferences: () => Promise<UserExercisePreference[]>;
  loadTemplate: () => Promise<TemplateDetail | null>;
  onSave: (input: SaveTemplateInput) => Promise<WorkoutTemplate>;
  onSaved: (id: string) => void;
};

export function EditTemplateScreen({ loadTemplate, ...flowProps }: EditTemplateScreenProps) {
  const [detail, setDetail] = useState<TemplateDetail | null>();
  useEffect(() => {
    let active = true;
    void loadTemplate().then(
      (loaded) => { if (active) setDetail(loaded); },
      () => { if (active) setDetail(null); },
    );
    return () => { active = false; };
  }, [loadTemplate]);

  if (detail === null) {
    return <Screen><ErrorState message="This workout could not be loaded for editing." title="Unable to edit workout" /></Screen>;
  }
  if (!detail) {
    return (
      <Screen accessibilityLabel="Loading workout editor" contentContainerStyle={styles.loading}>
        <ActivityIndicator color={colors.accent.primary} />
      </Screen>
    );
  }
  return <NewTemplateFlowScreen key={detail.template.id} initialDetail={detail} {...flowProps} />;
}

const styles = StyleSheet.create({
  loading: { alignItems: "center", justifyContent: "center" },
});
