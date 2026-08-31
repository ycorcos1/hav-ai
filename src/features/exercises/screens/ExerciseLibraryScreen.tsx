import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ErrorState } from '@/components/ErrorState';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Screen } from '@/components/Screen';
import type { Exercise, UserExercisePreference } from '@/shared/contracts';
import { colors, spacing } from '@/theme';

import { ExercisePicker } from '../components/ExercisePicker';

export type ExerciseLibraryScreenProps = {
  loadExercises: () => Promise<Exercise[]>;
  loadPreferences?: () => Promise<UserExercisePreference[]>;
  updateFavorite?: (exercise: Exercise, isFavorite: boolean) => Promise<void>;
};

export function ExerciseLibraryScreen({ loadExercises, loadPreferences, updateFavorite }: ExerciseLibraryScreenProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [preferenceError, setPreferenceError] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    void Promise.all([loadExercises(), loadPreferences?.() ?? Promise.resolve([])]).then(
      ([loadedExercises, preferences]) => {
        if (!active) return;
        setExercises(loadedExercises);
        setFavoriteIds(new Set(preferences.filter((preference) => preference.isFavorite).map((preference) => preference.exerciseId)));
        setStatus('ready');
      },
      () => {
        if (active) setStatus('error');
      },
    );

    return () => {
      active = false;
    };
  }, [loadExercises, loadPreferences, retryCount]);

  return (
    <Screen
      accessibilityLabel="Exercise library"
      contentContainerStyle={styles.content}
      scroll
    >
      <View style={styles.header}>
        <AppText variant="screenTitle">Exercise Library</AppText>
        <AppText color="secondary">Find an exercise to add to your training.</AppText>
      </View>

      <SecondaryButton label="Create custom exercise" onPress={() => router.push('/exercise/create')} />

      {status === 'loading' ? (
        <View accessibilityLabel="Loading exercises" style={styles.feedback}>
          <ActivityIndicator color={colors.accent.primary} />
          <AppText color="secondary">Loading exercises...</AppText>
        </View>
      ) : null}

      {status === 'error' ? (
        <ErrorState
          action={
            <SecondaryButton
              label="Try Again"
              onPress={() => {
                setStatus('loading');
                setRetryCount((count) => count + 1);
              }}
            />
          }
          message="Your local exercise library could not be loaded. Try again."
          title="Unable to load exercises"
        />
      ) : null}
      {preferenceError ? <AppText accessibilityRole="alert" color="secondary">Could not save that preference. Try again.</AppText> : null}

      {status === 'ready' ? (
        <ExercisePicker
          exercises={exercises}
          favoriteIds={favoriteIds}
          onToggleFavorite={updateFavorite ? (exercise, isFavorite) => {
            setPreferenceError(false);
            void updateFavorite(exercise, isFavorite).then(() => {
              setFavoriteIds((current) => { const next = new Set(current); if (isFavorite) next.add(exercise.id); else next.delete(exercise.id); return next; });
            }, () => setPreferenceError(true));
          } : undefined}
          onViewDetails={(exercise) => router.push(`/exercise/${exercise.id}`)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  feedback: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
});
