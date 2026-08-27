import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';

export type SyncStatus = 'hidden' | 'syncing' | 'synced' | 'needsAttention';

const statusLabels: Record<Exclude<SyncStatus, 'hidden'>, string> = {
  syncing: 'Syncing...',
  synced: 'Synced',
  needsAttention: 'Needs Attention',
};

export type SyncIndicatorProps = Omit<ViewProps, 'children'> & {
  message?: string;
  status: SyncStatus;
};

export function SyncIndicator({
  accessibilityLabel,
  message,
  status,
  style,
  ...viewProps
}: SyncIndicatorProps) {
  if (status === 'hidden') {
    return null;
  }

  const label = message ?? statusLabels[status];

  return (
    <View
      {...viewProps}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      accessible
      style={[styles.indicator, style]}
    >
      <View style={[styles.marker, markerStyles[status]]} />
      <AppText color="secondary" variant="metadata">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  marker: {
    borderRadius: radius.control,
    height: spacing.sm,
    width: spacing.sm,
  },
  syncing: {
    backgroundColor: colors.accent.primary,
  },
  synced: {
    backgroundColor: colors.semantic.success,
  },
  needsAttention: {
    backgroundColor: colors.semantic.error,
  },
});

const markerStyles = {
  syncing: styles.syncing,
  synced: styles.synced,
  needsAttention: styles.needsAttention,
};
