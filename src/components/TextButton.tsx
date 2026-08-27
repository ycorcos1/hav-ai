import { StyleSheet } from 'react-native';

import {
  ButtonBase,
  type ButtonBaseProps,
} from '@/components/ButtonBase';
import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';

export type TextButtonProps = Omit<
  ButtonBaseProps,
  'children' | 'indicatorColor' | 'stateStyles'
> & {
  label: string;
};

export function TextButton({
  accessibilityLabel,
  disabled = false,
  label,
  loading = false,
  ...buttonProps
}: TextButtonProps) {
  return (
    <ButtonBase
      {...buttonProps}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      indicatorColor={colors.accent.primary}
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
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.accent.soft,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: colors.accent.primary,
  },
});

const stateStyles = {
  base: styles.button,
  pressed: styles.pressed,
  disabled: styles.disabled,
};
