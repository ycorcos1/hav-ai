import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { BottomSheet } from "@/components/BottomSheet";
import { FilterChip } from "@/components/FilterChip";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextInput } from "@/components/TextInput";
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

export type SetInputValues = Pick<CompleteSetInput, "reps" | "rpe" | "weightKg">;

export type SetInputRowProps = {
  disabled?: boolean;
  initialWeightKg?: WeightKg;
  onComplete: (values: SetInputValues) => void;
  requiresWeight: boolean;
  rpePreference: RpePreference;
  weightUnit: WeightUnit;
};

const rpeValues: readonly RPE[] = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export function SetInputRow({
  disabled = false,
  initialWeightKg,
  onComplete,
  requiresWeight,
  rpePreference,
  weightUnit,
}: SetInputRowProps) {
  const [weight, setWeight] = useState(
    initialWeightKg === undefined ? "" : formatDisplayWeight(initialWeightKg, weightUnit),
  );
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState<RPE>();
  const [rpeOpen, setRpeOpen] = useState(false);

  const parsedWeight = Number(weight);
  const parsedReps = Number(reps);
  const weightValid = !requiresWeight
    || (weight.trim().length > 0 && Number.isFinite(parsedWeight) && parsedWeight >= 0);
  const repsValid = reps.trim().length > 0 && Number.isInteger(parsedReps) && parsedReps > 0;
  const canComplete = !disabled && weightValid && repsValid;

  const complete = () => {
    if (!canComplete) return;
    onComplete({
      reps: parsedReps,
      ...(requiresWeight
        ? { weightKg: canonicalWeightKg(parsedWeight, weightUnit) }
        : {}),
      ...(rpe === undefined ? {} : { rpe }),
    });
  };

  return (
    <View accessibilityLabel="Set input" style={styles.container}>
      <View style={styles.inputs}>
        {requiresWeight ? (
          <TextInput
            containerStyle={styles.field}
            disabled={disabled}
            error={weight.length > 0 && !weightValid ? "Enter a valid weight." : undefined}
            keyboardType="decimal-pad"
            label={`Weight (${weightUnit})`}
            onChangeText={setWeight}
            returnKeyType="next"
            value={weight}
          />
        ) : null}
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

      <PrimaryButton disabled={!canComplete} label="Complete Set" onPress={complete} />

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
  rpeField: { gap: spacing.sm },
  rpeOptions: { gap: spacing.sm },
});
