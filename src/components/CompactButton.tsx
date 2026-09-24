import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, sizing, spacing } from '@/theme';

export type CompactButtonProps = Omit<PressableProps, 'children' | 'disabled' | 'style'> & {
  disabled?: boolean;
  label: string;
  tone?: 'accent' | 'neutral' | 'quiet';
};

export function CompactButton({
  accessibilityLabel,
  disabled = false,
  label,
  tone = 'neutral',
  ...pressableProps
}: CompactButtonProps) {
  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        tone === 'accent' && styles.accent,
        tone === 'neutral' && styles.neutral,
        tone === 'quiet' && styles.quiet,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <AppText
        color={disabled ? 'muted' : 'primary'}
        style={tone === 'accent' && !disabled ? styles.accentLabel : undefined}
        variant="metadata"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.control,
    justifyContent: 'center',
    minHeight: sizing.minimumTouchTarget,
    paddingHorizontal: spacing.lg,
  },
  accent: {
    backgroundColor: colors.accent.primary,
  },
  accentLabel: {
    color: colors.background.primary,
  },
  neutral: {
    backgroundColor: colors.surface.elevated,
  },
  quiet: {
    backgroundColor: colors.accent.soft,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    backgroundColor: colors.surface.elevated,
    opacity: 0.55,
  },
});
