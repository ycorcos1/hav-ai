import { StyleSheet } from 'react-native';

import {
  ButtonBase,
  type ButtonBaseProps,
} from '@/components/ButtonBase';
import { AppText } from '@/components/AppText';
import { colors, radius, sizing, spacing } from '@/theme';

export type PrimaryButtonProps = Omit<
  ButtonBaseProps,
  'children' | 'indicatorColor' | 'stateStyles'
> & {
  label: string;
};

export function PrimaryButton({
  accessibilityLabel,
  disabled = false,
  label,
  loading = false,
  ...buttonProps
}: PrimaryButtonProps) {
  return (
    <ButtonBase
      {...buttonProps}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      indicatorColor={
        disabled ? colors.text.muted : colors.background.primary
      }
      loading={loading}
      stateStyles={stateStyles}
    >
      <AppText
        color={disabled ? 'muted' : 'primary'}
        style={!disabled && styles.label}
        variant="button"
      >
        {label}
      </AppText>
    </ButtonBase>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.input,
    minHeight: sizing.workoutControlMaximumHeight,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  pressed: {
    backgroundColor: colors.accent.pressed,
  },
  disabled: {
    backgroundColor: colors.surface.elevated,
    borderColor: colors.border.default,
    borderWidth: 1,
    opacity: 0.6,
  },
  label: {
    color: colors.background.primary,
  },
});

const stateStyles = {
  base: styles.button,
  pressed: styles.pressed,
  disabled: styles.disabled,
};
