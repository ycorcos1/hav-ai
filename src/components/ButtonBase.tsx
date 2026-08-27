import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { sizing } from '@/theme';

type ButtonStateStyles = {
  base: StyleProp<ViewStyle>;
  pressed: StyleProp<ViewStyle>;
  disabled: StyleProp<ViewStyle>;
};

export type ButtonBaseProps = Omit<
  PressableProps,
  'children' | 'disabled' | 'style'
> & {
  children: ReactNode;
  disabled?: boolean;
  indicatorColor: string;
  loading?: boolean;
  stateStyles: ButtonStateStyles;
  style?: PressableProps['style'];
};

export function ButtonBase({
  accessibilityRole,
  accessibilityState,
  children,
  disabled = false,
  indicatorColor,
  loading = false,
  stateStyles,
  style,
  ...pressableProps
}: ButtonBaseProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={{
        ...accessibilityState,
        busy: loading,
        disabled: isDisabled,
      }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        stateStyles.base,
        state.pressed && !isDisabled && stateStyles.pressed,
        disabled && stateStyles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading ? <ActivityIndicator color={indicatorColor} /> : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: sizing.minimumTouchTarget,
  },
});
