import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export type GroupedSurfaceProps = ViewProps & {
  children: ReactNode;
};

export function GroupedSurface({ children, style, ...viewProps }: GroupedSurfaceProps) {
  return (
    <View {...viewProps} style={[styles.surface, style]}>
      {children}
    </View>
  );
}

export function GroupedSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  separator: {
    backgroundColor: colors.border.default,
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
});
