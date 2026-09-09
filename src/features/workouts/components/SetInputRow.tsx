import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { BottomSheet } from "@/components/BottomSheet";
import { FilterChip } from "@/components/FilterChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextButton } from "@/components/TextButton";
import { TextInput } from "@/components/TextInput";
import { WeightAdjustmentControls } from "@/features/workouts/components/WeightAdjustmentControls";
import {
  canonicalWeightKg,
  formatDisplayWeight,
} from "@/features/workouts/services/weightConversion";
import type {
  CompleteSetInput,
  RPE,
  RpePreference,
  WeightKg,
  WeightUnit,
} from "@/shared/contracts";
import { spacing } from "@/theme";

export type SetInputValues = Pick<CompleteSetInput, "notes" | "reps" | "rpe" | "weightKg">;

export type SetInputDraft = {
  notes: string;
  notesVisible: boolean;
  reps: string;
  rpe?: RPE;
  weight: string;
};

export type SetInputRowProps = {
  actionLabel?: string;
  disabled?: boolean;
  initialNotes?: string;
  initialDraft?: SetInputDraft;
  initialReps?: number;
  initialRpe?: RPE;
  initialWeightKg?: WeightKg;
  onComplete: (values: SetInputValues) => void;
  onCompleteDraftCaptured?: (draft: SetInputDraft) => void;
  requiresWeight: boolean;
  rpePreference: RpePreference;
  weightUnit: WeightUnit;
};

const rpeValues: readonly RPE[] = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export function SetInputRow({
  actionLabel = "Complete Set",
  disabled = false,
  initialNotes,
  initialDraft,
  initialReps,
  initialRpe,
  initialWeightKg,
  onComplete,
  onCompleteDraftCaptured,
  requiresWeight,
  rpePreference,
  weightUnit,
}: SetInputRowProps) {
  const [weight, setWeight] = useState(
    initialDraft?.weight
      ?? (initialWeightKg === undefined ? "" : formatDisplayWeight(initialWeightKg, weightUnit)),
  );
  const [reps, setReps] = useState(
    initialDraft?.reps ?? (initialReps === undefined ? "" : String(initialReps)),
  );
  const [rpe, setRpe] = useState<RPE | undefined>(initialDraft?.rpe ?? initialRpe);
  const [rpeOpen, setRpeOpen] = useState(false);
  const [notes, setNotes] = useState(initialDraft?.notes ?? initialNotes ?? "");
  const [notesVisible, setNotesVisible] = useState(
    initialDraft?.notesVisible ?? Boolean(initialNotes),
  );

  const parsedWeight = Number(weight);
  const parsedReps = Number(reps);
  const weightValid = !requiresWeight
    || (weight.trim().length > 0 && Number.isFinite(parsedWeight) && parsedWeight >= 0);
  const repsValid = reps.trim().length > 0 && Number.isInteger(parsedReps) && parsedReps > 0;
  const canComplete = !disabled && weightValid && repsValid;

  const adjustReps = (delta: -1 | 1): void => {
    if (reps.trim() === "") {
      if (delta === 1) setReps("1");
      return;
    }
    if (!Number.isSafeInteger(parsedReps)) return;
    setReps(String(Math.max(1, parsedReps + delta)));
  };

  const complete = () => {
    if (!canComplete) return;
    const normalizedNotes = notes.trim() || undefined;
    onCompleteDraftCaptured?.({ notes, notesVisible, reps, rpe, weight });
    onComplete({
      reps: parsedReps,
      ...(requiresWeight
        ? { weightKg: canonicalWeightKg(parsedWeight, weightUnit) }
        : {}),
      ...(rpe === undefined ? {} : { rpe }),
      ...(notesVisible || initialNotes !== undefined ? { notes: normalizedNotes } : {}),
    });
  };

  return (
    <View accessibilityLabel="Set input" style={styles.container}>
      <View style={styles.inputs}>
        {requiresWeight ? (
          <View style={styles.field}>
            <TextInput
              disabled={disabled}
              error={weight.length > 0 && !weightValid ? "Enter a valid weight." : undefined}
              keyboardType="decimal-pad"
              label={`Weight (${weightUnit})`}
              onChangeText={setWeight}
              returnKeyType="next"
              value={weight}
            />
            <WeightAdjustmentControls
              disabled={disabled}
              onChange={setWeight}
              value={weight}
              weightUnit={weightUnit}
            />
          </View>
        ) : null}
        <View accessibilityLabel="Rep adjustments" style={styles.repField}>
          <TextButton
            accessibilityLabel="Decrease reps"
            disabled={disabled}
            label="−"
            onPress={() => adjustReps(-1)}
          />
          <TextInput
            containerStyle={styles.field}
            disabled={disabled}
            error={reps.length > 0 && !repsValid ? "Enter a whole number above zero." : undefined}
            keyboardType="number-pad"
            label="Reps"
            onChangeText={setReps}
            returnKeyType="done"
            value={reps}
          />
          <TextButton
            accessibilityLabel="Increase reps"
            disabled={disabled}
            label="+"
            onPress={() => adjustReps(1)}
          />
        </View>
      </View>

      {rpePreference !== "hidden" ? (
        <View style={styles.rpeField}>
          <AppText color="secondary" variant="metadata">
            RPE {rpePreference === "optional" ? "(optional)" : ""}
          </AppText>
          <SecondaryButton
            disabled={disabled}
            label={rpe === undefined ? "Select RPE" : `RPE ${rpe}`}
            onPress={() => setRpeOpen(true)}
          />
        </View>
      ) : null}

      <View style={styles.noteField}>
        <TextButton
          disabled={disabled}
          label={notesVisible ? "Hide Set Note" : "Add Set Note"}
          onPress={() => setNotesVisible((current) => !current)}
        />
        {notesVisible ? (
          <TextInput
            disabled={disabled}
            label="Set Note (optional)"
            multiline
            onChangeText={setNotes}
            value={notes}
          />
        ) : null}
      </View>

      <PrimaryButton disabled={!canComplete} label={actionLabel} onPress={complete} />

      <BottomSheet
        accessibilityLabel="RPE selection"
        onDismiss={() => setRpeOpen(false)}
        title="How hard was the set?"
        visible={rpeOpen}
      >
        <ScrollView horizontal contentContainerStyle={styles.rpeOptions}>
          {rpeValues.map((value) => (
            <FilterChip
              key={value}
              label={String(value)}
              onPress={() => {
                setRpe(value);
                setRpeOpen(false);
              }}
              selected={rpe === value}
            />
          ))}
        </ScrollView>
        <AppText color="muted" variant="metadata">10 = Maximum effort</AppText>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  field: { flex: 1 },
  inputs: { flexDirection: "row", gap: spacing.md },
  noteField: { gap: spacing.xs },
  repField: {
    alignItems: "flex-end",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
  rpeField: { gap: spacing.sm },
  rpeOptions: { gap: spacing.sm },
});
