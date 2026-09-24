import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, sizing, spacing } from '@/theme';

export type ListRowProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress?: () => void;
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
  value?: string;
};

export function ListRow({
  accessibilityLabel,
  disabled = false,
  onPress,
  subtitle,
  title,
  trailing,
  value,
}: ListRowProps) {
  const content = (
    <>
      <View style={styles.copy}>
        <AppText variant="exerciseName">{title}</AppText>
        {subtitle ? <AppText color="muted" variant="metadata">{subtitle}</AppText> : null}
      </View>
      <View style={styles.trailing}>
        {value ? <AppText color="secondary" variant="metadata">{value}</AppText> : null}
        {trailing}
        {onPress ? <AppText color="muted" style={styles.chevron}>›</AppText> : null}
      </View>
    </>
  );
  const resolvedLabel = accessibilityLabel ?? (value ? `${title}: ${value}` : title);

  if (!onPress) {
    return (
      <View accessibilityLabel={resolvedLabel} style={styles.row}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={resolvedLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: sizing.minimumTouchTarget + spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chevron: {
    fontSize: 24,
    lineHeight: 24,
  },
  pressed: {
    backgroundColor: colors.accent.soft,
  },
  disabled: {
    opacity: 0.6,
  },
});
