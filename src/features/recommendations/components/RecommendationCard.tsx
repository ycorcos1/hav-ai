import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { TextButton } from "@/components/TextButton";
import { explainRecommendation } from "@/features/recommendations/explanations";
import { formatDisplayWeight } from "@/features/workouts/services/weightConversion";
import type { ProgressionRecommendation, WeightUnit } from "@/shared/contracts";
import { spacing } from "@/theme";

export type RecommendationCardProps = {
  exerciseName: string;
  recommendation: ProgressionRecommendation;
  weightUnit: WeightUnit;
};

export function RecommendationCard({
  exerciseName,
  recommendation,
  weightUnit,
}: RecommendationCardProps) {
  const [showReasons, setShowReasons] = useState(false);
  const explanation = explainRecommendation(recommendation);
  return (
    <Card accessibilityLabel={`Next target for ${exerciseName}`} style={styles.card}>
      <AppText variant="exerciseName">{exerciseName}</AppText>
      <AppText color="secondary" variant="metadata">{directionLabel(recommendation)}</AppText>
      <AppText variant="sectionHeading">{targetLabel(recommendation, weightUnit)}</AppText>
      <AppText color="secondary">{repTargetLabel(recommendation)}</AppText>
      <TextButton
        label={showReasons ? "Hide Why" : "Why?"}
        onPress={() => setShowReasons((visible) => !visible)}
      />
      {showReasons ? (
        <View accessibilityLabel="Recommendation reasons" style={styles.reasons}>
          <AppText variant="sectionHeading">{explanation.title}</AppText>
          {explanation.reasons.map((reason) => (
            <AppText color="secondary" key={reason}>• {reason}</AppText>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function directionLabel(recommendation: ProgressionRecommendation): string {
  switch (recommendation.recommendationType) {
    case "increase_weight": return "LOAD UP";
    case "increase_reps": return "REPS UP";
    case "decrease_weight": return "LOAD DOWN";
    case "repeat_target": return "REPEAT";
    case "maintain_weight": return "MAINTAIN";
    case "insufficient_data": return "BASELINE";
  }
}

function targetLabel(
  recommendation: ProgressionRecommendation,
  weightUnit: WeightUnit,
): string {
  return recommendation.recommendedWeightKg === undefined
    ? "Bodyweight"
    : `${formatDisplayWeight(recommendation.recommendedWeightKg, weightUnit)} ${weightUnit}`;
}

function repTargetLabel(recommendation: ProgressionRecommendation): string {
  if (recommendation.targetSetReps) return recommendation.targetSetReps.join(" / ");
  if (recommendation.targetSets && recommendation.targetMinReps && recommendation.targetMaxReps) {
    return `${recommendation.targetSets} × ${recommendation.targetMinReps}-${recommendation.targetMaxReps}`;
  }
  return "No precise rep target yet";
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  reasons: { gap: spacing.xs },
});
