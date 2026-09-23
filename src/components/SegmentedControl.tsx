import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, sizing, spacing } from '@/theme';

export type SegmentedControlOption<T extends string> = {
  accessibilityLabel?: string;
  label: string;
  value: T;
};

export type SegmentedControlProps<T extends string> = {
  accessibilityLabel: string;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: readonly SegmentedControlOption<T>[];
  value: T;
};

export function SegmentedControl<T extends string>({
  accessibilityLabel,
  disabled = false,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              pressed && !disabled && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            <AppText
              color={selected ? 'primary' : 'secondary'}
              style={selected ? styles.selectedLabel : undefined}
              variant="metadata"
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.control,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.control,
    justifyContent: 'center',
    minHeight: sizing.minimumTouchTarget,
    minWidth: 58,
    paddingHorizontal: spacing.md,
  },
  selected: {
    backgroundColor: colors.accent.soft,
  },
  selectedLabel: {
    color: colors.accent.primary,
  },
  pressed: {
    backgroundColor: colors.surface.elevated,
  },
  disabled: {
    opacity: 0.6,
  },
});
