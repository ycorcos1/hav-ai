import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { TextButton } from "@/components/TextButton";
import { TextInput } from "@/components/TextInput";
import type { ProgressHome } from "@/features/progress/services/progressApplication";
import { formatDisplayWeight } from "@/features/workouts/services/weightConversion";
import { colors, spacing } from "@/theme";

export type ProgressScreenProps = {
  loadProgress: () => Promise<ProgressHome>;
  onOpenExercise: (id: string) => void;
};

export function ProgressScreen({ loadProgress, onOpenExercise }: ProgressScreenProps) {
  const [progress, setProgress] = useState<ProgressHome>();
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    void loadProgress().then(
      (loaded) => { if (active) setProgress(loaded); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [loadProgress]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!progress || !normalized) return progress?.exercises ?? [];
    return progress.exercises.filter(({ name }) => name.toLocaleLowerCase().includes(normalized));
  }, [progress, query]);

  if (failed) {
    return <Screen><ErrorState message="Your local progress could not be loaded." title="Unable to load progress" /></Screen>;
  }
  if (!progress) {
    return <Screen accessibilityLabel="Loading progress" contentContainerStyle={styles.centered}><ActivityIndicator color={colors.accent.primary} /></Screen>;
  }

  return (
    <Screen contentContainerStyle={styles.container} scroll>
      <AppText variant="screenTitle">Progress</AppText>
      <View style={styles.section}>
        <AppText variant="sectionHeading">Recent PRs</AppText>
        {progress.recentRecords.length === 0 ? (
          <AppText color="muted">Complete workouts to build your personal records.</AppText>
        ) : progress.recentRecords.map(({ exercise, record }) => (
          <Card key={`${record.type}-${record.setId}`}>
            <AppText variant="exerciseName">{exercise.name}</AppText>
            <AppText color="secondary">{recordLabel(record, progress.weightUnit)}</AppText>
          </Card>
        ))}
      </View>
      <View style={styles.section}>
        <AppText variant="sectionHeading">Exercise Progress</AppText>
        <TextInput
          accessibilityLabel="Search exercises"
          onChangeText={setQuery}
          placeholder="Search exercises..."
          value={query}
        />
        {filtered.length === 0 ? <AppText color="muted">No exercises found.</AppText> : null}
        {filtered.map((exercise) => (
          <Card key={exercise.id}>
            <TextButton label={exercise.name} onPress={() => onOpenExercise(exercise.id)} />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function recordLabel(
  record: ProgressHome["recentRecords"][number]["record"],
  unit: ProgressHome["weightUnit"],
): string {
  const value = record.type === "estimated_1rm" && record.estimated1RMKg !== undefined
    ? `${formatDisplayWeight(record.estimated1RMKg, unit)} ${unit} estimated 1RM`
    : record.weightKg !== undefined
      ? `${formatDisplayWeight(record.weightKg, unit)} ${unit}${record.reps ? ` × ${record.reps}` : ""}`
      : `${record.reps ?? 0} reps`;
  return `${record.type === "estimated_1rm" ? "Best e1RM" : "Best weight"} · ${value}`;
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  container: { backgroundColor: colors.background.primary, gap: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  section: { gap: spacing.md },
});
