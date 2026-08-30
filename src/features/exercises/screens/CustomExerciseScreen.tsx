import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ErrorState } from '@/components/ErrorState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import { TextInput } from '@/components/TextInput';
import type { EquipmentType, Exercise, MeasurementType, MuscleGroup } from '@/shared/contracts';
import { spacing } from '@/theme';

import { createCustomExercise, updateCustomExercise, type CustomExerciseInput } from '../services/customExercises';

const muscles: MuscleGroup[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'core', 'other'];
const equipment: EquipmentType[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other'];
const measurements: MeasurementType[] = ['weight_reps', 'bodyweight_reps', 'reps_only'];

export type CustomExerciseScreenProps = {
  existingExercise?: Exercise;
  onSaved: (id: string) => void;
  repository: Parameters<typeof createCustomExercise>[0];
  userId: string;
};

export function CustomExerciseScreen({ existingExercise, onSaved, repository, userId }: CustomExerciseScreenProps) {
  const [name, setName] = useState(existingExercise?.name ?? '');
  const [primaryMuscleGroup, setPrimaryMuscleGroup] = useState<MuscleGroup>(existingExercise?.primaryMuscleGroup ?? 'chest');
  const [secondaryMuscleGroups, setSecondaryMuscleGroups] = useState<MuscleGroup[]>(existingExercise?.secondaryMuscleGroups ?? []);
  const [equipmentType, setEquipmentType] = useState<EquipmentType>(existingExercise?.equipmentType ?? 'barbell');
  const [measurementType, setMeasurementType] = useState<MeasurementType>(existingExercise?.measurementType ?? 'weight_reps');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true); setError(undefined);
    try {
      const input: CustomExerciseInput = { name, primaryMuscleGroup, secondaryMuscleGroups, equipmentType, measurementType };
      const exercise = existingExercise
        ? await updateCustomExercise(repository, userId, existingExercise.id, input)
        : await createCustomExercise(repository, userId, input);
      onSaved(exercise.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save exercise.');
    } finally { setSaving(false); }
  }

  return (
    <Screen contentContainerStyle={styles.content} scroll>
      <AppText variant="screenTitle">{existingExercise ? 'Edit Custom Exercise' : 'Create Custom Exercise'}</AppText>
      <TextInput label="Name" onChangeText={setName} value={name} />
      <Choice label="Primary muscle" options={muscles} value={primaryMuscleGroup} onSelect={setPrimaryMuscleGroup} />
      <View style={styles.choice}><AppText color="secondary" variant="metadata">Secondary muscles (optional)</AppText><View style={styles.options}>{muscles.filter((muscle) => muscle !== primaryMuscleGroup).map((muscle) => <SecondaryButton key={muscle} label={format(muscle)} onPress={() => setSecondaryMuscleGroups((current) => current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle])} />)}</View><AppText>{secondaryMuscleGroups.map(format).join(', ') || 'None'}</AppText></View>
      <Choice label="Equipment" options={equipment} value={equipmentType} onSelect={setEquipmentType} />
      <Choice label="Measurement type" options={measurements} value={measurementType} onSelect={setMeasurementType} />
      {error ? <ErrorState message={error} title="Check your exercise" /> : null}
      <PrimaryButton disabled={saving} label={saving ? 'Saving...' : 'Save Exercise'} onPress={() => void save()} />
    </Screen>
  );
}

function Choice<T extends string>({ label, onSelect, options, value }: { label: string; onSelect: (value: T) => void; options: T[]; value: T }) {
  return <View style={styles.choice}><AppText color="secondary" variant="metadata">{label}</AppText><View style={styles.options}>{options.map((option) => <PrimaryButton key={option} label={format(option)} onPress={() => onSelect(option)} />)}</View><AppText>{format(value)}</AppText></View>;
}

function format(value: string): string { return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }

const styles = StyleSheet.create({ content: { gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl }, choice: { gap: spacing.sm }, options: { gap: spacing.sm } });
