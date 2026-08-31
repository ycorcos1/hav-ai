import { useState } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextInput } from "@/components/TextInput";
import {
  TemplateValidationError,
  validateExerciseConfiguration,
  type TemplateExerciseInput,
} from "@/features/templates/services/templateService";
import type { Exercise } from "@/shared/contracts";

export type TemplateExerciseConfigurationSheetProps = {
  exercise: Exercise | null;
  initialConfiguration?: TemplateExerciseInput;
  onDismiss: () => void;
  onSave: (configuration: TemplateExerciseInput) => void;
};

export function TemplateExerciseConfigurationSheet({
  exercise,
  initialConfiguration,
  onDismiss,
  onSave,
}: TemplateExerciseConfigurationSheetProps) {
  return (
    <TemplateExerciseConfigurationForm
      key={exercise?.id ?? "closed"}
      exercise={exercise}
      initialConfiguration={initialConfiguration}
      onDismiss={onDismiss}
      onSave={onSave}
    />
  );
}

function TemplateExerciseConfigurationForm({
  exercise,
  initialConfiguration,
  onDismiss,
  onSave,
}: TemplateExerciseConfigurationSheetProps) {
  const [targetSets, setTargetSets] = useState(initialConfiguration?.targetSets.toString() ?? "");
  const [targetMinReps, setTargetMinReps] = useState(initialConfiguration?.targetMinReps.toString() ?? "");
  const [targetMaxReps, setTargetMaxReps] = useState(initialConfiguration?.targetMaxReps.toString() ?? "");
  const [notes, setNotes] = useState(initialConfiguration?.notes ?? "");
  const [error, setError] = useState<string>();

  function save(): void {
    if (!exercise) return;
    const configuration: TemplateExerciseInput = {
      exerciseId: exercise.id,
      targetSets: Number(targetSets),
      targetMinReps: Number(targetMinReps),
      targetMaxReps: Number(targetMaxReps),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      validateExerciseConfiguration(configuration);
      setError(undefined);
      onSave(configuration);
    } catch (cause) {
      setError(cause instanceof TemplateValidationError
        ? cause.message
        : "Check the exercise configuration and try again.");
    }
  }

  return (
    <BottomSheet onDismiss={onDismiss} title={exercise?.name} visible={exercise !== null}>
      <TextInput label="Target Sets" keyboardType="number-pad" onChangeText={setTargetSets} value={targetSets} />
      <TextInput label="Minimum Reps" keyboardType="number-pad" onChangeText={setTargetMinReps} value={targetMinReps} />
      <TextInput label="Maximum Reps" keyboardType="number-pad" onChangeText={setTargetMaxReps} value={targetMaxReps} />
      <TextInput label="Exercise Notes (optional)" multiline onChangeText={setNotes} value={notes} />
      {error ? <ErrorState message={error} title="Check exercise targets" /> : null}
      <PrimaryButton label={initialConfiguration ? "Save Exercise" : "Add to Workout"} onPress={save} />
    </BottomSheet>
  );
}
