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
import { reorderTemplateExercises } from "../services/reorderTemplateExercises";

export type NewTemplateFlowScreenProps = {
  initialDetail?: import("@/features/templates/services/templateApplication").TemplateDetail;
  loadExercises: () => Promise<Exercise[]>;
  loadPreferences: () => Promise<UserExercisePreference[]>;
  onSave: (input: SaveTemplateInput) => Promise<WorkoutTemplate>;
  onSaved: (id: string) => void;
};

export function NewTemplateFlowScreen({
  initialDetail,
  loadExercises,
  loadPreferences,
  onSave,
  onSaved,
}: NewTemplateFlowScreenProps) {
  const [name, setName] = useState(initialDetail?.template.name ?? "");
  const [notes, setNotes] = useState(initialDetail?.template.notes ?? "");
  const [selections, setSelections] = useState<TemplateExerciseSelection[]>(() =>
    initialDetail?.exercises.map(({ exercise, templateExercise }) => ({
      exercise,
      exerciseId: templateExercise.exerciseId,
      id: templateExercise.id,
      targetSets: templateExercise.targetSets,
      targetMinReps: templateExercise.targetMinReps,
      targetMaxReps: templateExercise.targetMaxReps,
      ...(templateExercise.notes ? { notes: templateExercise.notes } : {}),
    })) ?? [],
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerStatus, setPickerStatus] = useState<"loading" | "ready" | "error">("loading");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [configurationExercise, setConfigurationExercise] = useState<Exercise | null>(null);
  const [configurationIndex, setConfigurationIndex] = useState<number>();

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
    setSelections((current) => {
      const selection = { ...configuration, exercise: configurationExercise };
      if (configurationIndex === undefined) return [...current, selection];
      return current.map((item, index) => index === configurationIndex
        ? { ...selection, id: item.id }
        : item);
    });
    setConfigurationExercise(null);
    setConfigurationIndex(undefined);
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
            onSelect={(exercise) => { setConfigurationIndex(undefined); setConfigurationExercise(exercise); }}
          />
        ) : null}
        <TemplateExerciseConfigurationSheet
          exercise={configurationExercise}
          initialConfiguration={configurationIndex === undefined ? undefined : selections[configurationIndex]}
          onDismiss={() => setConfigurationExercise(null)}
          onSave={addConfiguredExercise}
        />
      </Screen>
    );
  }

  return (
    <NewTemplateScreen
      exercises={selections}
      name={name}
      notes={notes}
      onAddExercise={() => { setPickerStatus("loading"); setPickerVisible(true); }}
      onEditExercise={(index) => {
        setConfigurationIndex(index);
        setConfigurationExercise(selections[index].exercise);
        setPickerVisible(true);
        setPickerStatus("ready");
      }}
      onMoveExercise={(index, direction) => {
        setSelections((current) => reorderTemplateExercises(current, index, direction));
      }}
      onNameChange={setName}
      onNotesChange={setNotes}
      onSave={onSave}
      onSaved={onSaved}
      onRemoveExercise={(index) => setSelections((current) => current.filter((_, itemIndex) => itemIndex !== index))}
      saveLabel={initialDetail ? "Save Changes" : "Save Workout"}
      title={initialDetail ? "Edit Workout" : "New Workout"}
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  header: { gap: spacing.md },
});
