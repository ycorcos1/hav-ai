import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors } from '@/theme';

export function OnboardingPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <AppText variant="screenTitle">Onboarding</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
  },
});
