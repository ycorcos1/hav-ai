import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, sizing, spacing } from '@/theme';

export type FilterChipProps = Omit<PressableProps, 'children'> & {
  label: string;
  selected: boolean;
};

export function FilterChip({
  accessibilityLabel,
  accessibilityState,
  disabled = false,
  label,
  selected,
  style,
  ...pressableProps
}: FilterChipProps) {
  const isDisabled = Boolean(disabled);

  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        disabled: isDisabled,
        selected,
      }}
      accessible
      disabled={isDisabled}
      style={(state) => [
        styles.chip,
        selected && styles.selected,
        state.pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <AppText color={isDisabled ? 'muted' : selected ? 'primary' : 'secondary'} variant="metadata">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.default,
    borderRadius: radius.panel,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: sizing.minimumTouchTarget,
    paddingHorizontal: spacing.lg,
  },
  selected: {
    backgroundColor: colors.accent.soft,
    borderColor: colors.accent.primary,
  },
  pressed: {
    backgroundColor: colors.surface.elevated,
  },
  disabled: {
    opacity: 0.6,
  },
});
