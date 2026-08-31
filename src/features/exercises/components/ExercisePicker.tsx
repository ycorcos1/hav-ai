import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { FilterChip } from "@/components/FilterChip";
import { SecondaryButton } from "@/components/SecondaryButton";
import { SearchInput } from "@/components/SearchInput";
import type { Exercise } from "@/shared/contracts";
import { spacing } from "@/theme";

import {
  discoverExercises,
  type DiscoverySection,
} from "../services/discoverExercises";
import {
  exerciseMuscleFilters,
  exerciseMuscleLabel,
  type ExerciseMuscleFilter,
} from "../services/filterExercises";

export type ExercisePickerProps = {
  exercises: Exercise[];
  favoriteIds?: ReadonlySet<string>;
  onSelect?: (exercise: Exercise) => void;
  onToggleFavorite?: (exercise: Exercise, isFavorite: boolean) => void;
  onViewDetails?: (exercise: Exercise) => void;
};

export function ExercisePicker({
  exercises,
  favoriteIds = new Set<string>(),
  onSelect,
  onToggleFavorite,
  onViewDetails,
}: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<ExerciseMuscleFilter>("all");
  const [section, setSection] = useState<DiscoverySection>("all");
  const availableExercises = useMemo(
    () => exercises.filter((exercise) => !exercise.isArchived),
    [exercises],
  );
  const visibleExercises = useMemo(
    () => discoverExercises(availableExercises, favoriteIds, section, query, muscleFilter),
    [availableExercises, favoriteIds, muscleFilter, query, section],
  );

  return (
    <View style={styles.content}>
      <SearchInput autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} value={query} />
      <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
        <FilterChip label="Popular" onPress={() => setSection("popular")} selected={section === "popular"} />
        <FilterChip label="Favorites" onPress={() => setSection("favorites")} selected={section === "favorites"} />
      </ScrollView>
      <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
        {exerciseMuscleFilters.map((filter) => (
          <FilterChip
            key={filter}
            label={exerciseMuscleLabel(filter)}
            onPress={() => {
              setMuscleFilter(filter);
              if (filter === "all") setSection("all");
            }}
            selected={muscleFilter === filter}
          />
        ))}
      </ScrollView>
      {visibleExercises.length === 0 ? (
        <EmptyState message="Try a different search or muscle group." title="No exercises found" />
      ) : (
        <View style={styles.list}>
          {visibleExercises.map((exercise) => (
            <Card key={exercise.id} testID={`exercise-${exercise.id}`}>
              <AppText variant="exerciseName">{exercise.name}</AppText>
              <AppText color="secondary" variant="metadata">
                {exerciseMuscleLabel(exercise.primaryMuscleGroup)} · {formatEquipment(exercise.equipmentType)}
              </AppText>
              {onViewDetails ? <SecondaryButton label="View details" onPress={() => onViewDetails(exercise)} /> : null}
              {onSelect ? <SecondaryButton accessibilityLabel={`Select ${exercise.name}`} label="Select" onPress={() => onSelect(exercise)} /> : null}
              {onToggleFavorite ? (
                <SecondaryButton
                  accessibilityLabel={`${favoriteIds.has(exercise.id) ? "Unfavorite" : "Favorite"} ${exercise.name}`}
                  accessibilityState={{ selected: favoriteIds.has(exercise.id) }}
                  label={favoriteIds.has(exercise.id) ? "Unfavorite" : "Favorite"}
                  onPress={() => onToggleFavorite(exercise, !favoriteIds.has(exercise.id))}
                />
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

function formatEquipment(equipment: Exercise["equipmentType"]): string {
  return equipment.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  filters: { gap: spacing.sm, paddingRight: spacing.lg },
  list: { gap: spacing.sm },
});
