import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

export type ScreenProps = {
  accessibilityLabel?: string;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Screen({
  accessibilityLabel,
  children,
  contentContainerStyle,
  scroll = false,
  style,
  testID,
}: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      {scroll ? (
        <ScrollView
          accessibilityLabel={accessibilityLabel}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          testID={testID}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          accessibilityLabel={accessibilityLabel}
          style={[styles.content, contentContainerStyle]}
          testID={testID}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background.primary,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenHorizontal,
  },
});
