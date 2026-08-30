import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FilterChip } from '@/components/FilterChip';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Screen } from '@/components/Screen';
import { SearchInput } from '@/components/SearchInput';
import type { Exercise } from '@/shared/contracts';
import { colors, spacing } from '@/theme';

import {
  exerciseMuscleFilters,
  exerciseMuscleLabel,
  filterExercises,
  type ExerciseMuscleFilter,
} from '../services/filterExercises';

export type ExerciseLibraryScreenProps = {
  loadExercises: () => Promise<Exercise[]>;
};

export function ExerciseLibraryScreen({ loadExercises }: ExerciseLibraryScreenProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<ExerciseMuscleFilter>('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    void loadExercises().then(
      (loadedExercises) => {
        if (!active) return;
        setExercises(loadedExercises);
        setStatus('ready');
      },
      () => {
        if (active) setStatus('error');
      },
    );

    return () => {
      active = false;
    };
  }, [loadExercises, retryCount]);

  const visibleExercises = useMemo(
    () => filterExercises(exercises, query, muscleFilter),
    [exercises, muscleFilter, query],
  );

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

      <SearchInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setQuery}
        value={query}
      />
      <SecondaryButton label="Create custom exercise" onPress={() => router.push('/exercise/create')} />

      <ScrollView
        contentContainerStyle={styles.filters}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {exerciseMuscleFilters.map((filter) => (
          <FilterChip
            key={filter}
            label={exerciseMuscleLabel(filter)}
            onPress={() => setMuscleFilter(filter)}
            selected={muscleFilter === filter}
          />
        ))}
      </ScrollView>

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

      {status === 'ready' && visibleExercises.length === 0 ? (
        <EmptyState
          message="Try a different search or muscle group."
          title="No exercises found"
        />
      ) : null}

      {status === 'ready' && visibleExercises.length > 0 ? (
        <View style={styles.list}>
          {visibleExercises.map((exercise) => (
            <Card key={exercise.id} testID={`exercise-${exercise.id}`}>
              <SecondaryButton label="View details" onPress={() => router.push(`/exercise/${exercise.id}`)} />
              <AppText variant="exerciseName">{exercise.name}</AppText>
              <AppText color="secondary" variant="metadata">
                {exerciseMuscleLabel(exercise.primaryMuscleGroup)} · {formatEquipment(exercise.equipmentType)}
              </AppText>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function formatEquipment(equipment: Exercise['equipmentType']): string {
  return equipment
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
  filters: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  feedback: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
});
