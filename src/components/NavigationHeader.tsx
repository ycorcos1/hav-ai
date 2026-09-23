import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { colors, spacing } from '@/theme';

export type NavigationHeaderProps = {
  accessibilityLabel?: string;
  onBack: () => void;
};

export function NavigationHeader({
  accessibilityLabel = 'Go back',
  onBack,
}: NavigationHeaderProps) {
  return (
    <View style={styles.container}>
      <IconButton
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Returns to the previous screen"
        icon={
          <AppText
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.chevron}
          >
            ‹
          </AppText>
        }
        onPress={onBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
  },
  chevron: {
    color: colors.text.primary,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
});
