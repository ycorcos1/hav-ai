import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { colors, radius, spacing } from '@/theme';

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen
      accessibilityLabel="Welcome to havAI"
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <View style={styles.accent} />
        <AppText variant="screenTitle">Welcome to havAI</AppText>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Create Account"
          onPress={() => router.push('/(auth)/signup')}
        />
        <SecondaryButton
          label="Log In"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xxxl,
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  accent: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.control,
    height: spacing.xs,
    width: spacing.xxl,
  },
  actions: {
    gap: spacing.md,
  },
});
