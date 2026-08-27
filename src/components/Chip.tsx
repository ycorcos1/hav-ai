import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';

export type ChipProps = ViewProps & {
  label: string;
};

export function Chip({ label, style, ...viewProps }: ChipProps) {
  return (
    <View {...viewProps} style={[styles.chip, style]}>
      <AppText color="secondary" variant="metadata">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.panel,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
