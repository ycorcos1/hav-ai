import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { TextButton } from "@/components/TextButton";
import type { WeightUnit } from "@/shared/contracts";
import { spacing } from "@/theme";

export type WeightAdjustmentControlsProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
  weightUnit: WeightUnit;
};

const increments = {
  lb: [5, 10, 25, 45],
  kg: [2.5, 5, 10, 20],
} as const;

export function WeightAdjustmentControls({
  disabled = false,
  onChange,
  value,
  weightUnit,
}: WeightAdjustmentControlsProps) {
  const [expanded, setExpanded] = useState(false);
  const [smallest, ...larger] = increments[weightUnit];

  const adjust = (delta: number): void => {
    const parsed = value.trim() === "" ? 0 : Number(value);
    if (!Number.isFinite(parsed)) return;
    const next = Math.max(0, parsed + delta);
    onChange(formatDraftWeight(next));
  };

  return (
    <View accessibilityLabel="Quick weight adjustments" style={styles.container}>
      <View style={styles.row}>
        <AdjustmentButton
          disabled={disabled}
          increment={smallest}
          onPress={() => adjust(-smallest)}
          operation="Decrease"
          weightUnit={weightUnit}
        />
        <TextButton
          disabled={disabled}
          label={expanded ? "Fewer" : "More"}
          accessibilityLabel={expanded
            ? "Hide larger weight adjustments"
            : "Show larger weight adjustments"}
          onPress={() => setExpanded((current) => !current)}
        />
        <AdjustmentButton
          disabled={disabled}
          increment={smallest}
          onPress={() => adjust(smallest)}
          operation="Increase"
          weightUnit={weightUnit}
        />
      </View>
      {expanded ? (
        <View style={styles.options}>
          {larger.flatMap((increment) => [
            <AdjustmentButton
              key={`decrease-${increment}`}
              disabled={disabled}
              increment={increment}
              onPress={() => adjust(-increment)}
              operation="Decrease"
              weightUnit={weightUnit}
            />,
            <AdjustmentButton
              key={`increase-${increment}`}
              disabled={disabled}
              increment={increment}
              onPress={() => adjust(increment)}
              operation="Increase"
              weightUnit={weightUnit}
            />,
          ])}
        </View>
      ) : null}
    </View>
  );
}

type AdjustmentButtonProps = {
  disabled: boolean;
  increment: number;
  onPress: () => void;
  operation: "Decrease" | "Increase";
  weightUnit: WeightUnit;
};

function AdjustmentButton({
  disabled,
  increment,
  onPress,
  operation,
  weightUnit,
}: AdjustmentButtonProps) {
  const sign = operation === "Increase" ? "+" : "−";
  return (
    <TextButton
      accessibilityLabel={`${operation} weight by ${increment} ${weightUnit}`}
      disabled={disabled}
      label={`${sign}${increment}`}
      onPress={onPress}
    />
  );
}

function formatDraftWeight(value: number): string {
  return String(Number(value.toFixed(2)));
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
