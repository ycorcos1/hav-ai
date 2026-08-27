import {
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { colors, typography } from '@/theme';

export type AppTextVariant =
  | 'display'
  | 'screenTitle'
  | 'sectionHeading'
  | 'exerciseName'
  | 'body'
  | 'metadata'
  | 'button';

export type AppTextColor = 'primary' | 'secondary' | 'muted';

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  color?: AppTextColor;
};

const variantStyles = StyleSheet.create<Record<AppTextVariant, TextStyle>>({
  display: typography.displayNumber,
  screenTitle: typography.screenTitle,
  sectionHeading: typography.sectionHeading,
  exerciseName: typography.exerciseName,
  body: typography.body,
  metadata: typography.metadata,
  button: typography.button,
});

const colorStyles = StyleSheet.create<Record<AppTextColor, TextStyle>>({
  primary: { color: colors.text.primary },
  secondary: { color: colors.text.secondary },
  muted: { color: colors.text.muted },
});

export function AppText({
  variant = 'body',
  color = 'primary',
  style,
  ...textProps
}: AppTextProps) {
  return (
    <Text
      {...textProps}
      style={[variantStyles[variant], colorStyles[color], style]}
    />
  );
}
