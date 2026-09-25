import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { spacing } from '@/theme';

export type EmptyStateProps = ViewProps & {
  action?: ReactNode;
  message?: string;
  title: string;
};

export function EmptyState({
  action,
  message,
  style,
  title,
  ...viewProps
}: EmptyStateProps) {
  return (
    <View {...viewProps} style={[styles.container, style]}>
      <AppText accessibilityRole="header" style={styles.copy} variant="exerciseName">
        {title}
      </AppText>
      {message ? <AppText color="secondary" style={styles.copy}>{message}</AppText> : null}
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
  action: {
    marginTop: spacing.sm,
  },
  copy: {
    textAlign: 'center',
  },
});
