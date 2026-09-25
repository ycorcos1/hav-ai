import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/theme';

export type ErrorStateProps = ViewProps & {
  action?: ReactNode;
  message: string;
  title: string;
};

export function ErrorState({
  action,
  message,
  style,
  title,
  ...viewProps
}: ErrorStateProps) {
  return (
    <View {...viewProps} style={[styles.container, style]}>
      <AppText
        accessibilityRole="alert"
        accessible
        style={styles.title}
        variant="exerciseName"
      >
        {title}
      </AppText>
      <AppText color="secondary" style={styles.copy}>{message}</AppText>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  title: {
    color: colors.semantic.error,
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.sm,
  },
});
