import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { TextButton } from "@/components/TextButton";
import { useNetworkStatus } from "@/features/network/components/NetworkStatusProvider";
import { explainRecommendation } from "@/features/recommendations/explanations";
import { formatDisplayWeight } from "@/features/workouts/services/weightConversion";
import type {
  ProgressionRecommendation,
  RecommendationExplanationV1,
  WeightUnit,
} from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export type RecommendationCardProps = {
  exerciseName: string;
  loadAIExplanation?: (recommendationId: string) => Promise<RecommendationExplanationV1>;
  recommendation: ProgressionRecommendation;
  weightUnit: WeightUnit;
};

export function RecommendationCard({
  exerciseName,
  loadAIExplanation,
  recommendation,
  weightUnit,
}: RecommendationCardProps) {
  const networkStatus = useNetworkStatus();
  const offline = networkStatus === "offline";
  const [showReasons, setShowReasons] = useState(false);
  const [aiExplanation, setAIExplanation] = useState<RecommendationExplanationV1>();
  const [aiFailed, setAIFailed] = useState(false);
  const [aiLoading, setAILoading] = useState(false);
  const mounted = useRef(true);
  const requestPending = useRef(false);
  const explanation = explainRecommendation(recommendation);

  useEffect(() => () => { mounted.current = false; }, []);

  async function loadRicherExplanation(): Promise<void> {
    if (!loadAIExplanation || requestPending.current) return;
    requestPending.current = true;
    setAILoading(true);
    setAIFailed(false);
    try {
      const result = await loadAIExplanation(recommendation.id);
      if (mounted.current) setAIExplanation(result);
    } catch {
      if (mounted.current) setAIFailed(true);
    } finally {
      requestPending.current = false;
      if (mounted.current) setAILoading(false);
    }
  }

  function toggleReasons(): void {
    const nextVisible = !showReasons;
    setShowReasons(nextVisible);
    if (nextVisible && !offline && loadAIExplanation && !aiExplanation && !aiFailed) {
      void loadRicherExplanation();
    }
  }

  return (
    <Card accessibilityLabel={`Next target for ${exerciseName}`} style={styles.card}>
      <AppText variant="exerciseName">{exerciseName}</AppText>
      <AppText color="secondary" variant="metadata">{directionLabel(recommendation)}</AppText>
      <AppText variant="sectionHeading">{targetLabel(recommendation, weightUnit)}</AppText>
      <AppText color="secondary">{repTargetLabel(recommendation)}</AppText>
      <TextButton
        label={showReasons ? "Hide Why" : "Why?"}
        onPress={toggleReasons}
      />
      {showReasons ? (
        <View accessibilityLabel="Recommendation reasons" style={styles.reasons}>
          <AppText variant="sectionHeading">{explanation.title}</AppText>
          {explanation.reasons.map((reason) => (
            <AppText color="secondary" key={reason}>• {reason}</AppText>
          ))}
          {offline && loadAIExplanation ? (
            <AppText color="muted">AI explanation requires an internet connection.</AppText>
          ) : null}
          {aiLoading ? (
            <AppText accessibilityLabel="AI explanation loading" color="muted">
              Reviewing the recommendation context...
            </AppText>
          ) : null}
          {aiExplanation ? (
            <View accessibilityLabel="AI recommendation explanation" style={styles.aiExplanation}>
              <AppText color="muted" variant="metadata">HAVAI COACH CONTEXT</AppText>
              <AppText variant="exerciseName">{aiExplanation.headline}</AppText>
              <AppText color="secondary">{aiExplanation.summary}</AppText>
              {aiExplanation.evidence.map((evidence) => (
                <AppText color="secondary" key={evidence}>• {evidence}</AppText>
              ))}
              {aiExplanation.caution ? (
                <AppText color="muted">{aiExplanation.caution}</AppText>
              ) : null}
            </View>
          ) : null}
          {aiFailed ? (
            <View accessibilityRole="alert" style={styles.aiFailure}>
              <AppText style={styles.error}>
                Couldn&apos;t generate the richer explanation right now. Your target is unchanged.
              </AppText>
              <TextButton label="Retry AI Explanation" onPress={() => { void loadRicherExplanation(); }} />
            </View>
          ) : null}
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
  aiExplanation: { gap: spacing.xs, marginTop: spacing.sm },
  aiFailure: { gap: spacing.xs, marginTop: spacing.sm },
  error: { color: colors.semantic.error },
});
