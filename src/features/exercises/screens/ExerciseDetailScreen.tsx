import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ErrorState } from '@/components/ErrorState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { TextButton } from '@/components/TextButton';
import type { Exercise } from '@/shared/contracts';
import { spacing } from '@/theme';

export type ExerciseDetailScreenProps = {
  exerciseId: string;
  loadExercise: (id: string) => Promise<Exercise | null>;
  onArchive?: (id: string) => Promise<void>;
  onEdit?: (id: string) => void;
};

export function ExerciseDetailScreen({
  exerciseId,
  loadExercise,
  onArchive,
  onEdit,
}: ExerciseDetailScreenProps) {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void loadExercise(exerciseId).then((value) => {
      if (active) setExercise(value);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [exerciseId, loadExercise]);

  if (error || exercise === null) {
    return error ? (
      <ErrorState message="This exercise could not be loaded." title="Unable to load exercise" />
    ) : (
      <Screen><AppText>Loading exercise...</AppText></Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content} scroll>
      <AppText variant="screenTitle">{exercise.name}</AppText>
      <View style={styles.details}>
        <Detail label="Primary muscle" value={format(exercise.primaryMuscleGroup)} />
        <Detail label="Secondary muscles" value={exercise.secondaryMuscleGroups.map(format).join(', ') || 'None'} />
        <Detail label="Equipment" value={format(exercise.equipmentType)} />
        <Detail label="Measurement" value={format(exercise.measurementType)} />
      </View>
      <AppText color="secondary" variant="sectionHeading">History</AppText>
      <AppText color="muted">History will appear after this exercise is used.</AppText>
      {!exercise.isSystem && onEdit && onArchive ? (
        <View style={styles.actions}>
          <PrimaryButton label="Edit Exercise" onPress={() => onEdit(exercise.id)} />
          <TextButton
            label="Archive Exercise"
            onPress={() => Alert.alert('Archive exercise?', 'It will be hidden from normal exercise lists.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Archive', style: 'destructive', onPress: () => void onArchive(exercise.id) },
            ])}
          />
        </View>
      ) : <SecondaryButton disabled label="System exercise · Read only" />}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View><AppText color="muted" variant="metadata">{label}</AppText><AppText>{value}</AppText></View>;
}

function format(value: string): string {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  details: { gap: spacing.md },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
