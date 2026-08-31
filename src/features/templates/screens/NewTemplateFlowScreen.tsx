import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { ExercisePicker } from "@/features/exercises/components/ExercisePicker";
import { TemplateExerciseConfigurationSheet } from "@/features/templates/components/TemplateExerciseConfigurationSheet";
import type { SaveTemplateInput, TemplateExerciseInput } from "@/features/templates/services/templateService";
import type { Exercise, UserExercisePreference, WorkoutTemplate } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

import { NewTemplateScreen, type TemplateExerciseSelection } from "./NewTemplateScreen";

export type NewTemplateFlowScreenProps = {
  loadExercises: () => Promise<Exercise[]>;
  loadPreferences: () => Promise<UserExercisePreference[]>;
  onSave: (input: SaveTemplateInput) => Promise<WorkoutTemplate>;
  onSaved: (id: string) => void;
};

export function NewTemplateFlowScreen({
  loadExercises,
  loadPreferences,
  onSave,
  onSaved,
}: NewTemplateFlowScreenProps) {
  const [selections, setSelections] = useState<TemplateExerciseSelection[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerStatus, setPickerStatus] = useState<"loading" | "ready" | "error">("loading");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [configurationExercise, setConfigurationExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    if (!pickerVisible || pickerStatus !== "loading") return;
    let active = true;
    void Promise.all([loadExercises(), loadPreferences()]).then(
      ([loadedExercises, preferences]) => {
        if (!active) return;
        setExercises(loadedExercises);
        setFavoriteIds(new Set(preferences.filter(({ isFavorite }) => isFavorite).map(({ exerciseId }) => exerciseId)));
        setPickerStatus("ready");
      },
      () => { if (active) setPickerStatus("error"); },
    );
    return () => { active = false; };
  }, [loadExercises, loadPreferences, pickerStatus, pickerVisible]);

  function addConfiguredExercise(configuration: TemplateExerciseInput): void {
    if (!configurationExercise) return;
    setSelections((current) => [...current, { ...configuration, exercise: configurationExercise }]);
    setConfigurationExercise(null);
    setPickerVisible(false);
  }

  if (pickerVisible) {
    return (
      <Screen contentContainerStyle={styles.content} scroll>
        <View style={styles.header}>
          <AppText variant="screenTitle">Add Exercise</AppText>
          <SecondaryButton label="Back to Workout" onPress={() => setPickerVisible(false)} />
        </View>
        {pickerStatus === "loading" ? <ActivityIndicator color={colors.accent.primary} /> : null}
        {pickerStatus === "error" ? <ErrorState message="Your exercise library could not be loaded." title="Unable to add exercise" /> : null}
        {pickerStatus === "ready" ? (
          <ExercisePicker
            exercises={exercises}
            favoriteIds={favoriteIds}
            onSelect={setConfigurationExercise}
          />
        ) : null}
        <TemplateExerciseConfigurationSheet
          exercise={configurationExercise}
          onDismiss={() => setConfigurationExercise(null)}
          onSave={addConfiguredExercise}
        />
      </Screen>
    );
  }

  return (
    <NewTemplateScreen
      exercises={selections}
      onAddExercise={() => { setPickerStatus("loading"); setPickerVisible(true); }}
      onSave={onSave}
      onSaved={onSaved}
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  header: { gap: spacing.md },
});
