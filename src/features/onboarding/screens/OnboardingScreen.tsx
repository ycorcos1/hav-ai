import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { FilterChip } from '@/components/FilterChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import type { ProfileRepository } from '@/lib/supabase/repositories';
import type { PrimaryGoal, WeightUnit } from '@/shared/contracts';
import { spacing } from '@/theme';

type OnboardingScreenProps = {
  profileRepository: ProfileRepository;
};

export function OnboardingScreen({ profileRepository }: OnboardingScreenProps) {
  const router = useRouter();
  const [weightUnit, setWeightUnit] = useState<WeightUnit>();
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const canComplete = weightUnit !== undefined && primaryGoal !== undefined;

  const completeOnboarding = async () => {
    if (isSubmitting || !canComplete) return;

    setIsSubmitting(true);
    setErrorMessage(undefined);

    try {
      await profileRepository.updateOwnProfile({
        weightUnit,
        primaryGoal,
        rpePreference: 'optional',
        progressionStyle: 'balanced',
        defaultRestDurationSeconds: 120,
        onboardingCompleted: true,
      });
      router.replace('/');
    } catch {
      setErrorMessage('Unable to save your setup. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen
      accessibilityLabel="Set up your havAI profile"
      contentContainerStyle={styles.content}
      scroll
    >
      <View style={styles.header}>
        <AppText variant="screenTitle">Set up your profile</AppText>
        <AppText color="secondary">
          Choose the settings that shape your training experience.
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="sectionHeading">Weight unit</AppText>
        <View accessibilityRole="radiogroup" style={styles.options}>
          <FilterChip
            accessibilityLabel="Pounds"
            accessibilityState={{ selected: weightUnit === 'lb' }}
            label="Pounds (lb)"
            onPress={() => setWeightUnit('lb')}
            selected={weightUnit === 'lb'}
          />
          <FilterChip
            accessibilityLabel="Kilograms"
            accessibilityState={{ selected: weightUnit === 'kg' }}
            label="Kilograms (kg)"
            onPress={() => setWeightUnit('kg')}
            selected={weightUnit === 'kg'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="sectionHeading">Primary goal</AppText>
        <View accessibilityRole="radiogroup" style={styles.options}>
          <FilterChip
            accessibilityLabel="Build muscle"
            accessibilityState={{ selected: primaryGoal === 'hypertrophy' }}
            label="Build Muscle"
            onPress={() => setPrimaryGoal('hypertrophy')}
            selected={primaryGoal === 'hypertrophy'}
          />
          <FilterChip
            accessibilityLabel="Get stronger"
            accessibilityState={{ selected: primaryGoal === 'strength' }}
            label="Get Stronger"
            onPress={() => setPrimaryGoal('strength')}
            selected={primaryGoal === 'strength'}
          />
          <FilterChip
            accessibilityLabel="Both"
            accessibilityState={{ selected: primaryGoal === 'hybrid' }}
            label="Both"
            onPress={() => setPrimaryGoal('hybrid')}
            selected={primaryGoal === 'hybrid'}
          />
        </View>
      </View>

      {errorMessage ? (
        <AppText accessibilityRole="alert" color="secondary">
          {errorMessage}
        </AppText>
      ) : null}

      <PrimaryButton
        disabled={!canComplete}
        label="Start Training"
        loading={isSubmitting}
        onPress={completeOnboarding}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
    justifyContent: 'center',
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xxxl,
  },
  header: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
