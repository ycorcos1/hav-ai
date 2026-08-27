import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';

const defaultMessage = 'Offline · Saved on device';

export type OfflineBannerProps = Omit<ViewProps, 'children'> & {
  message?: string;
  visible?: boolean;
};

export function OfflineBanner({
  accessibilityLabel,
  message = defaultMessage,
  style,
  visible = true,
  ...viewProps
}: OfflineBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View
      {...viewProps}
      accessibilityLabel={accessibilityLabel ?? message}
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      accessible
      style={[styles.banner, style]}
    >
      <View style={styles.marker} />
      <AppText color="secondary" variant="metadata">
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.default,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  marker: {
    backgroundColor: colors.semantic.warning,
    borderRadius: radius.control,
    height: spacing.sm,
    width: spacing.sm,
  },
});
