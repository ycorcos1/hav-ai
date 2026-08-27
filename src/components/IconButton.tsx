import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import {
  ButtonBase,
  type ButtonBaseProps,
} from '@/components/ButtonBase';
import { colors, radius, sizing } from '@/theme';

export type IconButtonProps = Omit<
  ButtonBaseProps,
  'children' | 'indicatorColor' | 'stateStyles'
> & {
  icon: ReactNode;
};

export function IconButton({
  icon,
  loading = false,
  ...buttonProps
}: IconButtonProps) {
  return (
    <ButtonBase
      {...buttonProps}
      indicatorColor={colors.accent.primary}
      loading={loading}
      stateStyles={stateStyles}
    >
      {icon}
    </ButtonBase>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.control,
    height: sizing.minimumTouchTarget,
    width: sizing.minimumTouchTarget,
  },
  pressed: {
    backgroundColor: colors.accent.soft,
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
