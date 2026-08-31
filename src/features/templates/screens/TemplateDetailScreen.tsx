import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import type { TemplateDetail } from "@/features/templates/services/templateApplication";
import { colors, spacing } from "@/theme";

export type TemplateDetailScreenProps = {
  loadTemplate: () => Promise<TemplateDetail | null>;
};

export function TemplateDetailScreen({ loadTemplate }: TemplateDetailScreenProps) {
  const [detail, setDetail] = useState<TemplateDetail | null>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void loadTemplate().then(
      (loaded) => { if (active) setDetail(loaded); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [loadTemplate]);

  if (failed || detail === null) {
    return <Screen><ErrorState message="This local workout could not be loaded." title="Unable to load workout" /></Screen>;
  }
  if (!detail) {
    return <Screen contentContainerStyle={styles.loading}><ActivityIndicator color={colors.accent.primary} /></Screen>;
  }

  return (
    <Screen contentContainerStyle={styles.content} scroll>
      <AppText variant="screenTitle">{detail.template.name}</AppText>
      {detail.template.notes ? <AppText color="secondary">{detail.template.notes}</AppText> : null}
      <View style={styles.list}>
        {detail.exercises.map(({ exercise, templateExercise }) => (
          <Card key={templateExercise.id}>
            <AppText variant="exerciseName">{exercise.name}</AppText>
            <AppText color="secondary">
              {templateExercise.targetSets} sets · {templateExercise.targetMinReps}-{templateExercise.targetMaxReps} reps
            </AppText>
            {templateExercise.notes ? <AppText color="muted" variant="metadata">{templateExercise.notes}</AppText> : null}
          </Card>
        ))}
      </View>
      <PrimaryButton accessibilityHint="Workout starting is enabled in a later phase." disabled label="Start" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  list: { gap: spacing.sm },
  loading: { alignItems: "center", justifyContent: "center" },
});
