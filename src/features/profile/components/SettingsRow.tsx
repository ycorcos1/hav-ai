import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, sizing, spacing } from '@/theme';

export type SettingsRowProps = {
  accessibilityLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onPress?: () => void;
  selected?: boolean;
  showChevron?: boolean;
  subtitle?: string;
  value?: string;
};

export function SettingsRow({
  accessibilityLabel,
  destructive = false,
  disabled = false,
  label,
  onPress,
  selected = false,
  showChevron = Boolean(onPress),
  subtitle,
  value,
}: SettingsRowProps) {
  const content = (
    <>
      <View style={styles.copy}>
        <AppText style={destructive ? styles.destructive : undefined}>{label}</AppText>
        {subtitle ? <AppText color="muted" variant="metadata">{subtitle}</AppText> : null}
      </View>
      <View style={styles.trailing}>
        {value ? (
          <AppText color={selected ? 'primary' : 'secondary'} variant="metadata">
            {value}
          </AppText>
        ) : null}
        {selected ? <AppText style={styles.selected}>✓</AppText> : null}
        {showChevron ? <AppText color="muted" style={styles.chevron}>›</AppText> : null}
      </View>
    </>
  );
  const resolvedLabel = accessibilityLabel ?? (value ? `${label}: ${value}` : label);

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
      accessibilityState={{ disabled, selected }}
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

export function SettingsSeparator() {
  return <View style={styles.separator} />;
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
  selected: {
    color: colors.accent.primary,
  },
  destructive: {
    color: colors.semantic.error,
  },
  pressed: {
    backgroundColor: colors.accent.soft,
  },
  disabled: {
    opacity: 0.6,
  },
  separator: {
    backgroundColor: colors.border.default,
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
});
