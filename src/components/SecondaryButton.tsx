import { StyleSheet } from 'react-native';

import {
  ButtonBase,
  type ButtonBaseProps,
} from '@/components/ButtonBase';
import { AppText } from '@/components/AppText';
import { colors, radius, sizing, spacing } from '@/theme';

export type SecondaryButtonProps = Omit<
  ButtonBaseProps,
  'children' | 'indicatorColor' | 'stateStyles'
> & {
  label: string;
};

export function SecondaryButton({
  accessibilityLabel,
  disabled = false,
  label,
  loading = false,
  ...buttonProps
}: SecondaryButtonProps) {
  return (
    <ButtonBase
      {...buttonProps}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      indicatorColor={colors.text.primary}
      loading={loading}
      stateStyles={stateStyles}
    >
      <AppText color={disabled ? 'muted' : 'primary'} variant="button">
        {label}
      </AppText>
    </ButtonBase>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.input,
    minHeight: sizing.workoutControlMinimumHeight,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  pressed: {
    backgroundColor: colors.surface.primary,
  },
  disabled: {
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.default,
    borderWidth: 1,
    opacity: 0.6,
  },
});

const stateStyles = {
  base: styles.button,
  pressed: styles.pressed,
  disabled: styles.disabled,
};
