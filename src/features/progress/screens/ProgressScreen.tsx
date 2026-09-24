import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { GroupedSeparator, GroupedSurface } from "@/components/GroupedSurface";
import { ListRow } from "@/components/ListRow";
import { Screen } from "@/components/Screen";
import { SearchInput } from "@/components/SearchInput";
import { SectionHeader } from "@/components/SectionHeader";
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
      <View style={styles.header}>
        <AppText variant="screenTitle">Progress</AppText>
        <AppText color="secondary">Explore performance and personal records by exercise.</AppText>
      </View>
      <View style={styles.section}>
        <SectionHeader color="secondary" title="RECENT PRS" />
        {progress.recentRecords.length === 0 ? (
          <GroupedSurface>
            <EmptyState
              message="Complete workouts to build your personal-record history."
              title="No personal records yet"
            />
          </GroupedSurface>
        ) : (
          <GroupedSurface>
            {progress.recentRecords.map(({ exercise, record }, index) => (
              <View key={`${record.type}-${record.setId}`}>
                {index > 0 ? <GroupedSeparator /> : null}
                <ListRow title={exercise.name} value={recordLabel(record, progress.weightUnit)} />
              </View>
            ))}
          </GroupedSurface>
        )}
      </View>
      <View style={styles.section}>
        <SectionHeader color="secondary" title="EXERCISE PROGRESS" />
        <SearchInput
          accessibilityLabel="Search exercises"
          onChangeText={setQuery}
          placeholder="Search exercises..."
          value={query}
        />
        {filtered.length === 0 ? (
          <GroupedSurface>
            <EmptyState
              message={query.trim() ? "Try a different exercise name." : "Exercises appear after your library is available."}
              title={query.trim() ? "No matching exercises" : "No exercises yet"}
            />
          </GroupedSurface>
        ) : (
          <GroupedSurface>
            {filtered.map((exercise, index) => (
              <View key={exercise.id}>
                {index > 0 ? <GroupedSeparator /> : null}
                <ListRow
                  onPress={() => onOpenExercise(exercise.id)}
                  subtitle={muscleGroupLabel(exercise.primaryMuscleGroup)}
                  title={exercise.name}
                />
              </View>
            ))}
          </GroupedSurface>
        )}
      </View>
    </Screen>
  );
}

function muscleGroupLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  container: { backgroundColor: colors.background.primary, gap: spacing.xl, paddingBottom: spacing.xxxl + spacing.xl, paddingTop: spacing.xl },
  header: { gap: spacing.sm },
  section: { gap: spacing.sm },
});
