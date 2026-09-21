import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { BottomSheet } from "@/components/BottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextInput } from "@/components/TextInput";
import { useNetworkStatus } from "@/features/network/components/NetworkStatusProvider";
import {
  canonicalWeightKg,
  formatDisplayWeight,
} from "@/features/workouts/services/weightConversion";
import type {
  ParseWorkoutRequestV1,
  ParseWorkoutResponseV1,
  RPE,
  WeightUnit,
} from "@/shared/contracts";
import { colors, spacing } from "@/theme";

type QuickLogDraft = {
  reps: string;
  rpe: string;
  weight: string;
};

export type ConfirmedQuickLogSet = {
  reps: number;
  rpe?: RPE;
  weightKg?: number;
};

export type QuickLogSheetProps = {
  displayUnit: WeightUnit;
  exerciseId: string;
  onCompleteSet: (set: ConfirmedQuickLogSet) => Promise<boolean>;
  onDismiss: () => void;
  parseWorkout: (request: ParseWorkoutRequestV1) => Promise<ParseWorkoutResponseV1>;
  requiresWeight: boolean;
  visible: boolean;
};

const validRpeValues = new Set([6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]);

export function QuickLogSheet({
  displayUnit,
  exerciseId,
  onCompleteSet,
  onDismiss,
  parseWorkout,
  requiresWeight,
  visible,
}: QuickLogSheetProps) {
  const networkStatus = useNetworkStatus();
  const offline = networkStatus === "offline";
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<QuickLogDraft[]>([]);
  const [ambiguities, setAmbiguities] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<ParseWorkoutResponseV1["confidence"]>();
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  async function parse(): Promise<void> {
    const normalized = text.trim();
    if (!normalized || parsing || offline) return;
    setParsing(true);
    setParseFailed(false);
    setSaveFailed(false);
    try {
      const result = await parseWorkout({ text: normalized, exerciseId, displayUnit });
      setDrafts(result.sets.map((set) => ({
        reps: String(set.reps),
        rpe: set.rpe === undefined ? "" : String(set.rpe),
        weight: set.weight === undefined
          ? ""
          : formatDisplayWeight(
            canonicalWeightKg(set.weight, set.unit ?? displayUnit),
            displayUnit,
          ),
      })));
      setAmbiguities(result.ambiguities);
      setConfidence(result.confidence);
    } catch {
      setParseFailed(true);
    } finally {
      setParsing(false);
    }
  }

  function updateDraft(index: number, patch: Partial<QuickLogDraft>): void {
    setDrafts((current) => current.map((draft, draftIndex) => (
      draftIndex === index ? { ...draft, ...patch } : draft
    )));
  }

  async function confirm(): Promise<void> {
    if (saving || !draftsAreValid(drafts, requiresWeight)) return;
    setSaving(true);
    setSaveFailed(false);
    let completedCount = 0;
    for (const draft of drafts) {
      const rpe = draft.rpe.trim() ? Number(draft.rpe) as RPE : undefined;
      const saved = await onCompleteSet({
        reps: Number(draft.reps),
        ...(rpe === undefined ? {} : { rpe }),
        ...(requiresWeight
          ? { weightKg: canonicalWeightKg(Number(draft.weight), displayUnit) }
          : {}),
      });
      if (!saved) {
        setDrafts((current) => current.slice(completedCount));
        setSaveFailed(true);
        setSaving(false);
        return;
      }
      completedCount += 1;
    }
    setSaving(false);
    setText("");
    setDrafts([]);
    setAmbiguities([]);
    setConfidence(undefined);
    onDismiss();
  }

  return (
    <BottomSheet
      accessibilityLabel="Quick Log"
      closeLabel="Cancel"
      onDismiss={saving ? () => {} : onDismiss}
      title="Quick Log"
      visible={visible}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText color="secondary">
          Describe your completed sets, then review every value before saving.
        </AppText>
        {offline ? (
          <AppText accessibilityRole="alert" style={styles.error}>
            Quick Log requires an internet connection. Use manual set logging instead.
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel="Quick Log workout text"
          disabled={offline || parsing || saving}
          multiline
          onChangeText={setText}
          placeholder="185 for 8, 7, 6, last set RPE 9"
          value={text}
        />
        <SecondaryButton
          disabled={offline || !text.trim() || saving}
          label="Parse Sets"
          loading={parsing}
          onPress={() => { void parse(); }}
        />
        {parseFailed ? (
          <AppText accessibilityRole="alert" style={styles.error}>
            Quick Log could not parse that entry. Nothing was saved.
          </AppText>
        ) : null}
        {confidence ? (
          <AppText color="muted" variant="metadata">
            PARSER CONFIDENCE · {confidence.toUpperCase()}
          </AppText>
        ) : null}
        {ambiguities.map((ambiguity) => (
          <AppText accessibilityRole="alert" color="secondary" key={ambiguity}>
            Check this: {ambiguity}
          </AppText>
        ))}
        {drafts.map((draft, index) => (
          <View accessibilityLabel={`Quick Log set ${index + 1}`} key={index} style={styles.row}>
            <AppText variant="sectionHeading">Set {index + 1}</AppText>
            {requiresWeight ? (
              <TextInput
                disabled={saving}
                keyboardType="decimal-pad"
                label={`Weight (${displayUnit})`}
                onChangeText={(weight) => updateDraft(index, { weight })}
                value={draft.weight}
              />
            ) : null}
            <TextInput
              disabled={saving}
              keyboardType="number-pad"
              label="Reps"
              onChangeText={(reps) => updateDraft(index, { reps })}
              value={draft.reps}
            />
            <TextInput
              disabled={saving}
              keyboardType="decimal-pad"
              label="RPE (optional)"
              onChangeText={(rpe) => updateDraft(index, { rpe })}
              value={draft.rpe}
            />
          </View>
        ))}
        {saveFailed ? (
          <AppText accessibilityRole="alert" style={styles.error}>
            A set could not be saved. Already completed sets remain saved; review the remaining rows.
          </AppText>
        ) : null}
        {drafts.length > 0 ? (
          <PrimaryButton
            disabled={!draftsAreValid(drafts, requiresWeight)}
            label="Confirm Sets"
            loading={saving}
            onPress={() => { void confirm(); }}
          />
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

function draftsAreValid(drafts: QuickLogDraft[], requiresWeight: boolean): boolean {
  return drafts.length > 0 && drafts.every((draft) => {
    const reps = Number(draft.reps);
    const weight = Number(draft.weight);
    const rpe = Number(draft.rpe);
    return Number.isInteger(reps)
      && reps > 0
      && (!requiresWeight || (draft.weight.trim() !== "" && Number.isFinite(weight) && weight >= 0))
      && (draft.rpe.trim() === "" || validRpeValues.has(rpe));
  });
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  error: { color: colors.semantic.error },
  row: { gap: spacing.sm },
});
