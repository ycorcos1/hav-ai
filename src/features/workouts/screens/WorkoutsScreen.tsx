import { useEffect, useEffectEvent, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { CompactButton } from '@/components/CompactButton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { GroupedSurface } from '@/components/GroupedSurface';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SecondaryButton } from '@/components/SecondaryButton';
import type { WorkoutTemplate } from '@/shared/contracts';
import { colors, spacing } from '@/theme';

export type WorkoutsScreenProps = {
  loadTemplates: () => Promise<WorkoutTemplate[]>;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onOpenHistory?: () => void;
};

export function WorkoutsScreen({ loadTemplates, onCreate, onOpen, onOpenHistory }: WorkoutsScreenProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [attempt, setAttempt] = useState(0);
  const loadTemplatesForAttempt = useEffectEvent(loadTemplates);

  useEffect(() => {
    let active = true;
    void loadTemplatesForAttempt().then(
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
  }, [attempt]);

  return (
    <Screen contentContainerStyle={styles.container} scroll>
      <View style={styles.header}>
        <AppText variant="screenTitle">Workouts</AppText>
        <AppText color="secondary">Build reusable training plans and revisit completed sessions.</AppText>
      </View>
      {onOpenHistory ? (
        <View style={styles.section}>
          <SectionHeader color="secondary" title="TRAINING" />
          <GroupedSurface>
            <ListRow
              onPress={onOpenHistory}
              subtitle="Review completed sessions"
              title="Workout History"
            />
          </GroupedSurface>
        </View>
      ) : null}
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
        <View style={styles.section}>
          <SectionHeader color="secondary" title="WORKOUT TEMPLATES" />
          <GroupedSurface>
            <EmptyState
              action={<CompactButton label="Create Workout" onPress={onCreate} tone="accent" />}
              message="Create your first reusable workout to start tracking progression."
              title="No workouts yet"
            />
          </GroupedSurface>
        </View>
      ) : null}
      {status === 'ready' && templates.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <SectionHeader color="secondary" title="WORKOUT TEMPLATES" />
            <CompactButton label="Create Workout" onPress={onCreate} tone="quiet" />
          </View>
          {templates.map((template) => (
            <GroupedSurface key={template.id} testID={`template-${template.id}`}>
              <ListRow
                subtitle={`${template.exercises.length} ${template.exercises.length === 1 ? 'exercise' : 'exercises'}`}
                title={template.name}
              />
              <View style={styles.actions}>
                <CompactButton label="Open Template" onPress={() => onOpen(template.id)} tone="quiet" />
                <CompactButton
                  accessibilityHint="Workout starting is available from Home."
                  disabled
                  label="Start"
                />
              </View>
            </GroupedSurface>
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
    paddingBottom: spacing.xxxl + spacing.xl,
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
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
