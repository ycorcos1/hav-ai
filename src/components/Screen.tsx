import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavigationHeader } from '@/components/NavigationHeader';
import { colors, spacing } from '@/theme';

export type ScreenProps = {
  accessibilityLabel?: string;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  navigationAction?: {
    accessibilityLabel?: string;
    onBack: () => void;
  };
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Screen({
  accessibilityLabel,
  children,
  contentContainerStyle,
  navigationAction,
  scroll = false,
  style,
  testID,
}: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      {navigationAction ? (
        <NavigationHeader
          accessibilityLabel={navigationAction.accessibilityLabel}
          onBack={navigationAction.onBack}
        />
      ) : null}
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
