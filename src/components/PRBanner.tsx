import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';

export type PRBannerProps = Omit<ViewProps, 'children'> & {
  previousValue?: string;
  title: string;
  value: string;
};

export function PRBanner({
  accessibilityLabel,
  previousValue,
  style,
  title,
  value,
  ...viewProps
}: PRBannerProps) {
  const announcement = [title, value, previousValue].filter(Boolean).join('. ');

  return (
    <View
      {...viewProps}
      accessibilityLabel={accessibilityLabel ?? announcement}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessible
      style={[styles.banner, style]}
    >
      <AppText style={styles.title} variant="sectionHeading">
        {title}
      </AppText>
      <AppText variant="exerciseName">{value}</AppText>
      {previousValue ? (
        <AppText color="secondary" variant="metadata">
          {previousValue}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.accent.soft,
    borderColor: colors.accent.primary,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  title: {
    color: colors.accent.primary,
  },
});
