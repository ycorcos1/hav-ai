import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import type { ProfileSettings } from "@/features/profile/services/profileApplication";
import type { UpdateOwnProfileInput } from "@/lib/supabase/repositories";
import { colors, spacing } from "@/theme";

export type ProfileScreenProps = {
  loadProfile: () => Promise<ProfileSettings | null>;
  onLogout?: () => void;
  updateProfile?: (input: UpdateOwnProfileInput) => Promise<ProfileSettings["profile"]>;
};

export function ProfileScreen({ loadProfile, onLogout, updateProfile }: ProfileScreenProps) {
  const [settings, setSettings] = useState<ProfileSettings | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [savingUnit, setSavingUnit] = useState(false);
  const [savingRpe, setSavingRpe] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let active = true;
    void loadProfile().then(
      (loaded) => {
        if (!active) return;
        setSettings(loaded);
        setFailed(false);
      },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [attempt, loadProfile]);

  if (failed || settings === null) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <ErrorState
          action={failed ? (
            <SecondaryButton
              label="Try Again"
              onPress={() => {
                setFailed(false);
                setAttempt((value) => value + 1);
              }}
            />
          ) : undefined}
          message={failed
            ? "Your profile settings could not be loaded."
            : "No authenticated profile is available."}
          title="Unable to load Profile"
        />
      </Screen>
    );
  }
  if (!settings) {
    return (
      <Screen accessibilityLabel="Loading Profile" contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent.primary} />
      </Screen>
    );
  }

  const { profile } = settings;
  async function saveWeightUnit(weightUnit: ProfileSettings["profile"]["weightUnit"]): Promise<void> {
    if (!updateProfile || savingUnit || weightUnit === profile.weightUnit) return;
    setSavingUnit(true);
    setSaveError(false);
    try {
      const updated = await updateProfile({ weightUnit });
      setSettings((current) => current ? { ...current, profile: updated } : current);
    } catch {
      setSaveError(true);
    } finally {
      setSavingUnit(false);
    }
  }

  async function saveRpePreference(
    rpePreference: ProfileSettings["profile"]["rpePreference"],
  ): Promise<void> {
    if (!updateProfile || savingRpe || rpePreference === profile.rpePreference) return;
    setSavingRpe(true);
    setSaveError(false);
    try {
      const updated = await updateProfile({ rpePreference });
      setSettings((current) => current ? { ...current, profile: updated } : current);
    } catch {
      setSaveError(true);
    } finally {
      setSavingRpe(false);
    }
  }

  async function savePrimaryGoal(
    primaryGoal: ProfileSettings["profile"]["primaryGoal"],
  ): Promise<void> {
    if (!updateProfile || savingGoal || primaryGoal === profile.primaryGoal) return;
    setSavingGoal(true);
    setSaveError(false);
    try {
      const updated = await updateProfile({ primaryGoal });
      setSettings((current) => current ? { ...current, profile: updated } : current);
    } catch {
      setSaveError(true);
    } finally {
      setSavingGoal(false);
    }
  }

  return (
    <Screen contentContainerStyle={styles.container} scroll>
      <AppText variant="screenTitle">Profile</AppText>
      <View style={styles.section}>
        <AppText variant="sectionHeading">Training Preferences</AppText>
        <Card style={styles.card}>
          <PreferenceRow label="Units" value={profile.weightUnit === "lb" ? "Pounds (lb)" : "Kilograms (kg)"} />
          {updateProfile ? (
            <View accessibilityLabel="Weight unit options" style={styles.options}>
              <SecondaryButton
                disabled={savingUnit || profile.weightUnit === "lb"}
                label="Use Pounds (lb)"
                onPress={() => { void saveWeightUnit("lb"); }}
              />
              <SecondaryButton
                disabled={savingUnit || profile.weightUnit === "kg"}
                label="Use Kilograms (kg)"
                onPress={() => { void saveWeightUnit("kg"); }}
              />
            </View>
          ) : null}
          {saveError ? (
            <AppText accessibilityRole="alert" style={styles.error}>
              Your training preference could not be saved. Nothing else was changed.
            </AppText>
          ) : null}
          <PreferenceRow label="Primary Goal" value={goalLabel(profile.primaryGoal)} />
          {updateProfile ? (
            <View accessibilityLabel="Primary goal options" style={styles.options}>
              {(["hypertrophy", "strength", "hybrid"] as const).map((goal) => (
                <SecondaryButton
                  disabled={savingGoal || profile.primaryGoal === goal}
                  key={goal}
                  label={`Goal ${goalLabel(goal)}`}
                  onPress={() => { void savePrimaryGoal(goal); }}
                />
              ))}
            </View>
          ) : null}
          <PreferenceRow label="RPE Preference" value={preferenceLabel(profile.rpePreference)} />
          {updateProfile ? (
            <View accessibilityLabel="RPE preference options" style={styles.options}>
              {(["hidden", "optional", "preferred"] as const).map((preference) => (
                <SecondaryButton
                  disabled={savingRpe || profile.rpePreference === preference}
                  key={preference}
                  label={`RPE ${preferenceLabel(preference)}`}
                  onPress={() => { void saveRpePreference(preference); }}
                />
              ))}
            </View>
          ) : null}
          <PreferenceRow label="Progression Style" value={styleLabel(profile.progressionStyle)} />
          <PreferenceRow label="Default Rest" value={`${profile.defaultRestDurationSeconds} seconds`} />
        </Card>
      </View>
      <View style={styles.section}>
        <AppText variant="sectionHeading">Account</AppText>
        <Card style={styles.card}>
          <PreferenceRow label="Email" value={settings.email ?? "Authenticated account"} />
          <SecondaryButton disabled={!onLogout} label="Logout" onPress={onLogout ?? (() => {})} />
        </Card>
      </View>
    </Screen>
  );
}

function PreferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <View accessibilityLabel={`${label}: ${value}`} style={styles.row}>
      <AppText color="secondary">{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function goalLabel(goal: ProfileSettings["profile"]["primaryGoal"]): string {
  if (goal === "strength") return "Get Stronger";
  if (goal === "hypertrophy") return "Build Muscle";
  return "Both";
}

function preferenceLabel(preference: ProfileSettings["profile"]["rpePreference"]): string {
  if (preference === "hidden") return "Hidden";
  if (preference === "preferred") return "Preferred";
  return "Optional";
}

function styleLabel(style: ProfileSettings["profile"]["progressionStyle"]): string {
  return style[0].toUpperCase() + style.slice(1);
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  centered: { alignItems: "center", justifyContent: "center" },
  container: {
    backgroundColor: colors.background.primary,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  error: { color: colors.semantic.error },
  options: { gap: spacing.sm },
  row: { gap: spacing.xs },
  section: { gap: spacing.md },
});
