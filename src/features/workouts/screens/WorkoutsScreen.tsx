import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import type { WorkoutTemplate } from '@/shared/contracts';
import { colors, spacing } from '@/theme';

export type WorkoutsScreenProps = {
  loadTemplates: () => Promise<WorkoutTemplate[]>;
  onCreate: () => void;
  onOpen: (id: string) => void;
};

export function WorkoutsScreen({ loadTemplates, onCreate, onOpen }: WorkoutsScreenProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void loadTemplates().then(
      (loaded) => {
        if (!active) return;
        setTemplates(loaded);
        setStatus('ready');
      },
      () => {
        if (active) setStatus('error');
      },
    );
    return () => { active = false; };
  }, [attempt, loadTemplates]);

  return (
    <Screen contentContainerStyle={styles.container} scroll>
      <AppText variant="screenTitle">Workouts</AppText>
      {status === 'loading' ? (
        <View accessibilityLabel="Loading workouts" style={styles.feedback}>
          <ActivityIndicator color={colors.accent.primary} />
          <AppText color="secondary">Loading workouts...</AppText>
        </View>
      ) : null}
      {status === 'error' ? (
        <ErrorState
          action={<SecondaryButton label="Try Again" onPress={() => { setStatus('loading'); setAttempt((value) => value + 1); }} />}
          message="Your local workouts could not be loaded. Try again."
          title="Unable to load workouts"
        />
      ) : null}
      {status === 'ready' && templates.length === 0 ? (
        <EmptyState
          action={<PrimaryButton label="Create Workout" onPress={onCreate} />}
          message="Create your first workout to start tracking progression."
          title="No workouts yet"
        />
      ) : null}
      {status === 'ready' && templates.length > 0 ? (
        <View style={styles.list}>
          <PrimaryButton label="Create Workout" onPress={onCreate} />
          {templates.map((template) => (
            <Card key={template.id} testID={`template-${template.id}`}>
              <AppText variant="exerciseName">{template.name}</AppText>
              <AppText color="secondary" variant="metadata">
                {template.exercises.length} {template.exercises.length === 1 ? 'exercise' : 'exercises'}
              </AppText>
              <View style={styles.actions}>
                <SecondaryButton label="Open Template" onPress={() => onOpen(template.id)} />
                <PrimaryButton accessibilityHint="Workout starting is enabled in a later phase." disabled label="Start" />
              </View>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  feedback: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
