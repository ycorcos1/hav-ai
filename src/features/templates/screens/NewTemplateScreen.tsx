import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextInput } from "@/components/TextInput";
import {
  TemplateValidationError,
  validateExerciseConfiguration,
  type SaveTemplateInput,
  type TemplateExerciseInput,
} from "@/features/templates/services/templateService";
import type { Exercise, WorkoutTemplate } from "@/shared/contracts";
import { spacing } from "@/theme";

export type TemplateExerciseSelection = TemplateExerciseInput & {
  exercise: Exercise;
};

export type NewTemplateScreenProps = {
  exercises: TemplateExerciseSelection[];
  onAddExercise: () => void;
  onSave: (input: SaveTemplateInput) => Promise<WorkoutTemplate>;
  onSaved: (id: string) => void;
};

export function NewTemplateScreen({
  exercises,
  onAddExercise,
  onSave,
  onSaved,
}: NewTemplateScreenProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    if (saving) return;
    setError(undefined);
    try {
      if (!name.trim()) throw new TemplateValidationError("Enter a workout name.");
      if (exercises.length === 0) throw new TemplateValidationError("Add at least one exercise.");
      exercises.forEach(validateExerciseConfiguration);
      setSaving(true);
      const template = await onSave({
        name,
        ...(notes.trim() ? { notes } : {}),
        exercises: exercises.map(({ exercise: _exercise, ...configuration }) => configuration),
      });
      onSaved(template.id);
    } catch (cause) {
      setError(cause instanceof TemplateValidationError
        ? cause.message
        : "Your workout wasn't saved. Your changes are still here. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentContainerStyle={styles.content} scroll>
      <AppText variant="screenTitle">New Workout</AppText>
      <TextInput label="Workout Name" onChangeText={setName} value={name} />
      <TextInput label="Notes (optional)" multiline onChangeText={setNotes} value={notes} />
      <View style={styles.list}>
        {exercises.map((selection, index) => (
          <Card key={`${selection.exercise.id}-${index}`}>
            <AppText variant="exerciseName">{selection.exercise.name}</AppText>
            <AppText color="secondary">
              {selection.targetSets} sets · {selection.targetMinReps}-{selection.targetMaxReps} reps
            </AppText>
            {selection.notes ? <AppText color="muted" variant="metadata">{selection.notes}</AppText> : null}
          </Card>
        ))}
      </View>
      <SecondaryButton label="Add Exercise" onPress={onAddExercise} />
      {error ? <ErrorState message={error} title="Unable to save workout" /> : null}
      <PrimaryButton label="Save Workout" loading={saving} onPress={() => { void save(); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  list: { gap: spacing.sm },
});
