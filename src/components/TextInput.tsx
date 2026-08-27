import { useState } from 'react';
import {
  StyleSheet,
  TextInput as NativeTextInput,
  View,
  type StyleProp,
  type TextInputProps as NativeTextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, sizing, spacing, typography } from '@/theme';

type AccessibleInputName =
  | {
      accessibilityLabel?: string;
      label: string;
    }
  | {
      accessibilityLabel: string;
      label?: string;
    };

export type TextInputProps = Omit<
  NativeTextInputProps,
  'accessibilityLabel' | 'editable' | 'style'
> &
  AccessibleInputName & {
    containerStyle?: StyleProp<ViewStyle>;
    disabled?: boolean;
    error?: string;
    inputStyle?: StyleProp<TextStyle>;
  };

export function TextInput({
  accessibilityLabel,
  containerStyle,
  disabled = false,
  error,
  inputStyle,
  label,
  onBlur,
  onFocus,
  ...inputProps
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText color={disabled ? 'muted' : 'secondary'} variant="metadata">
          {label}
        </AppText>
      ) : null}
      <NativeTextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        accessible
        aria-invalid={Boolean(error)}
        editable={!disabled}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={colors.text.muted}
        selectionColor={colors.accent.primary}
        style={[
          styles.input,
          isFocused && styles.focused,
          Boolean(error) && styles.error,
          disabled && styles.disabled,
          inputStyle,
        ]}
      />
      {error ? (
        <AppText
          accessibilityRole="alert"
          accessible
          style={styles.errorText}
          variant="metadata"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.default,
    borderRadius: radius.input,
    borderWidth: 1,
    color: colors.text.primary,
    minHeight: sizing.workoutControlMinimumHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  focused: {
    borderColor: colors.accent.primary,
  },
  error: {
    borderColor: colors.semantic.error,
  },
  disabled: {
    backgroundColor: colors.background.primary,
    color: colors.text.muted,
    opacity: 0.6,
  },
  errorText: {
    color: colors.semantic.error,
  },
});
