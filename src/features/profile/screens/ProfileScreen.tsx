import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { BottomSheet } from "@/components/BottomSheet";
import { ErrorState } from "@/components/ErrorState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TextInput } from "@/components/TextInput";
import {
  SettingsRow,
  SettingsSeparator,
} from "@/features/profile/components/SettingsRow";
import type { ProfileSettings } from "@/features/profile/services/profileApplication";
import type { UpdateOwnProfileInput } from "@/lib/supabase/repositories";
import { colors, radius, spacing } from "@/theme";

export type ProfileScreenProps = {
  loadProfile: () => Promise<ProfileSettings | null>;
  prepareLogout?: () => Promise<"pending_sync" | "signed_out">;
  trySyncAndLogout?: () => Promise<boolean>;
  updateProfile?: (input: UpdateOwnProfileInput) => Promise<ProfileSettings["profile"]>;
};

type ProfileSheet = "deviceSync" | "goal" | "logout" | "progression" | "rest" | "rpe";

export function ProfileScreen({
  loadProfile,
  prepareLogout,
  trySyncAndLogout,
  updateProfile,
}: ProfileScreenProps) {
  const [settings, setSettings] = useState<ProfileSettings | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [activeSheet, setActiveSheet] = useState<ProfileSheet>();
  const [savingUnit, setSavingUnit] = useState(false);
  const [savingRpe, setSavingRpe] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingProgressionStyle, setSavingProgressionStyle] = useState(false);
  const [savingRestDuration, setSavingRestDuration] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [logoutState, setLogoutState] = useState<"idle" | "checking" | "pending" | "syncing" | "error">("idle");

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

  function openSheet(sheet: ProfileSheet): void {
    setSaveError(false);
    setActiveSheet(sheet);
  }

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
      setActiveSheet(undefined);
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
      setActiveSheet(undefined);
    } catch {
      setSaveError(true);
    } finally {
      setSavingGoal(false);
    }
  }

  async function saveProgressionStyle(
    progressionStyle: ProfileSettings["profile"]["progressionStyle"],
  ): Promise<void> {
    if (
      !updateProfile
      || savingProgressionStyle
      || progressionStyle === profile.progressionStyle
    ) return;
    setSavingProgressionStyle(true);
    setSaveError(false);
    try {
      const updated = await updateProfile({ progressionStyle });
      setSettings((current) => current ? { ...current, profile: updated } : current);
      setActiveSheet(undefined);
    } catch {
      setSaveError(true);
    } finally {
      setSavingProgressionStyle(false);
    }
  }

  async function saveDefaultRestDuration(defaultRestDurationSeconds: number): Promise<void> {
    if (
      !updateProfile
      || savingRestDuration
      || defaultRestDurationSeconds === profile.defaultRestDurationSeconds
    ) return;
    setSavingRestDuration(true);
    setSaveError(false);
    try {
      const updated = await updateProfile({ defaultRestDurationSeconds });
      setSettings((current) => current ? { ...current, profile: updated } : current);
      setActiveSheet(undefined);
    } catch {
      setSaveError(true);
    } finally {
      setSavingRestDuration(false);
    }
  }

  async function requestLogout(): Promise<void> {
    if (!prepareLogout || logoutState === "checking" || logoutState === "syncing") return;
    setLogoutState("checking");
    try {
      const result = await prepareLogout();
      if (result === "pending_sync") {
        setLogoutState("pending");
        setActiveSheet("logout");
      }
    } catch {
      setLogoutState("error");
      setActiveSheet("logout");
    }
  }

  async function retrySyncBeforeLogout(): Promise<void> {
    if (!trySyncAndLogout || logoutState === "syncing") return;
    setLogoutState("syncing");
    try {
      if (!await trySyncAndLogout()) setLogoutState("error");
    } catch {
      setLogoutState("error");
    }
  }

  function cancelLogout(): void {
    setLogoutState("idle");
    setActiveSheet(undefined);
  }

  return (
    <Screen contentContainerStyle={styles.container} scroll>
      <AppText variant="screenTitle">Profile</AppText>

      <View accessibilityLabel="Account identity" style={styles.identity}>
        <View accessibilityElementsHidden style={styles.avatar}>
          <AppText style={styles.avatarText} variant="exerciseName">
            {accountInitial(settings.email)}
          </AppText>
        </View>
        <View style={styles.identityCopy}>
          <AppText variant="exerciseName">Your havAI account</AppText>
          <AppText color="secondary" numberOfLines={1}>
            {settings.email ?? "Authenticated account"}
          </AppText>
        </View>
      </View>

      <SettingsSection title="TRAINING PREFERENCES">
        <UnitsRow
          disabled={!updateProfile || savingUnit}
          onChange={(weightUnit) => { void saveWeightUnit(weightUnit); }}
          value={profile.weightUnit}
        />
        <SettingsSeparator />
        <SettingsRow
          disabled={!updateProfile}
          label="Primary Goal"
          onPress={() => openSheet("goal")}
          value={goalLabel(profile.primaryGoal)}
        />
        <SettingsSeparator />
        <SettingsRow
          disabled={!updateProfile}
          label="RPE Preference"
          onPress={() => openSheet("rpe")}
          value={preferenceLabel(profile.rpePreference)}
        />
        <SettingsSeparator />
        <SettingsRow
          disabled={!updateProfile}
          label="Progression Style"
          onPress={() => openSheet("progression")}
          value={styleLabel(profile.progressionStyle)}
        />
      </SettingsSection>

      {saveError && activeSheet === undefined ? <PreferenceSaveError /> : null}

      <SettingsSection title="WORKOUT SETTINGS">
        <SettingsRow
          disabled={!updateProfile}
          label="Default Rest"
          onPress={() => openSheet("rest")}
          value={formatRestDuration(profile.defaultRestDurationSeconds)}
        />
      </SettingsSection>

      <SettingsSection title="ACCOUNT">
        <SettingsRow label="Email" value={settings.email ?? "Authenticated account"} />
        <SettingsSeparator />
        <SettingsRow
          label="Device Sync"
          onPress={() => openSheet("deviceSync")}
          subtitle="One active device in V1"
        />
        <SettingsSeparator />
        <SettingsRow
          destructive
          disabled={!prepareLogout || logoutState === "checking" || logoutState === "syncing"}
          label="Logout"
          onPress={() => { void requestLogout(); }}
          showChevron={false}
        />
      </SettingsSection>

      <SelectionSheet
        error={saveError && activeSheet === "goal"}
        onDismiss={() => setActiveSheet(undefined)}
        onSelect={(goal) => { void savePrimaryGoal(goal); }}
        options={[
          { accessibilityLabel: "Goal Build Muscle", label: "Build Muscle", value: "hypertrophy" },
          { accessibilityLabel: "Goal Get Stronger", label: "Get Stronger", value: "strength" },
          { accessibilityLabel: "Goal Both", label: "Both", value: "hybrid" },
        ]}
        saving={savingGoal}
        selectedValue={profile.primaryGoal}
        title="Primary Goal"
        visible={activeSheet === "goal"}
      />
      <SelectionSheet
        error={saveError && activeSheet === "rpe"}
        onDismiss={() => setActiveSheet(undefined)}
        onSelect={(preference) => { void saveRpePreference(preference); }}
        options={[
          { accessibilityLabel: "RPE Hidden", label: "Hidden", value: "hidden" },
          { accessibilityLabel: "RPE Optional", label: "Optional", value: "optional" },
          { accessibilityLabel: "RPE Preferred", label: "Preferred", value: "preferred" },
        ]}
        saving={savingRpe}
        selectedValue={profile.rpePreference}
        title="RPE Preference"
        visible={activeSheet === "rpe"}
      />
      <SelectionSheet
        error={saveError && activeSheet === "progression"}
        onDismiss={() => setActiveSheet(undefined)}
        onSelect={(progressionStyle) => { void saveProgressionStyle(progressionStyle); }}
        options={[
          { accessibilityLabel: "Progression Conservative", label: "Conservative", value: "conservative" },
          { accessibilityLabel: "Progression Balanced", label: "Balanced", value: "balanced" },
          { accessibilityLabel: "Progression Aggressive", label: "Aggressive", value: "aggressive" },
        ]}
        saving={savingProgressionStyle}
        selectedValue={profile.progressionStyle}
        title="Progression Style"
        visible={activeSheet === "progression"}
      />
      <BottomSheet
        accessibilityLabel="Edit default rest duration"
        onDismiss={() => setActiveSheet(undefined)}
        title="Default Rest"
        visible={activeSheet === "rest"}
      >
        <AppText color="secondary">
          Used after working sets unless an exercise has its own rest override.
        </AppText>
        <RestDurationPreference
          key={profile.defaultRestDurationSeconds}
          onSave={saveDefaultRestDuration}
          saving={savingRestDuration}
          value={profile.defaultRestDurationSeconds}
        />
        {saveError ? <PreferenceSaveError /> : null}
      </BottomSheet>
      <BottomSheet
        accessibilityLabel="Device sync information"
        onDismiss={() => setActiveSheet(undefined)}
        title="Device Sync"
        visible={activeSheet === "deviceSync"}
      >
        <AppText color="secondary">
          V1 is designed for one active device at a time. Unsynced local workout data is
          protected rather than silently replaced; simultaneous edits are not merged field by field.
        </AppText>
      </BottomSheet>
      <BottomSheet
        accessibilityLabel="Pending workout data"
        dismissOnBackdropPress={false}
        onDismiss={cancelLogout}
        title="Unsynced workout data"
        visible={activeSheet === "logout"}
      >
        <AppText color="secondary">
          Sync your saved device data before logging out so it is not left behind.
        </AppText>
        {logoutState === "error" ? (
          <AppText accessibilityRole="alert" style={styles.error}>
            Your data is still saved on this device. Sync could not finish, so you were not logged out.
          </AppText>
        ) : null}
        <PrimaryButton
          disabled={logoutState === "syncing"}
          label="Try Sync"
          loading={logoutState === "syncing"}
          onPress={() => { void retrySyncBeforeLogout(); }}
        />
        <SecondaryButton
          disabled={logoutState === "syncing"}
          label="Cancel"
          onPress={cancelLogout}
        />
      </BottomSheet>
    </Screen>
  );
}

function SettingsSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <AppText color="secondary" variant="sectionHeading">{title}</AppText>
      <View style={styles.settingsGroup}>{children}</View>
    </View>
  );
}

function UnitsRow({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: "kg" | "lb") => void;
  value: "kg" | "lb";
}) {
  return (
    <View
      accessibilityLabel={`Units: ${value === "lb" ? "Pounds (lb)" : "Kilograms (kg)"}`}
      style={styles.unitsRow}
    >
      <AppText>Units</AppText>
      <SegmentedControl
        accessibilityLabel="Weight unit options"
        disabled={disabled}
        onChange={onChange}
        options={[
          { accessibilityLabel: "Use Pounds (lb)", label: "lb", value: "lb" },
          { accessibilityLabel: "Use Kilograms (kg)", label: "kg", value: "kg" },
        ]}
        value={value}
      />
    </View>
  );
}

function SelectionSheet<T extends string>({
  error,
  onDismiss,
  onSelect,
  options,
  saving,
  selectedValue,
  title,
  visible,
}: {
  error: boolean;
  onDismiss: () => void;
  onSelect: (value: T) => void;
  options: readonly { accessibilityLabel: string; label: string; value: T }[];
  saving: boolean;
  selectedValue: T;
  title: string;
  visible: boolean;
}) {
  return (
    <BottomSheet onDismiss={onDismiss} title={title} visible={visible}>
      <View style={styles.selectionList}>
        {options.map((option, index) => (
          <View key={option.value}>
            {index > 0 ? <SettingsSeparator /> : null}
            <SettingsRow
              accessibilityLabel={option.accessibilityLabel}
              disabled={saving}
              label={option.label}
              onPress={() => onSelect(option.value)}
              selected={option.value === selectedValue}
              showChevron={false}
            />
          </View>
        ))}
      </View>
      {error ? <PreferenceSaveError /> : null}
    </BottomSheet>
  );
}

function RestDurationPreference({
  onSave,
  saving,
  value,
}: {
  onSave: (value: number) => Promise<void>;
  saving: boolean;
  value: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const valid = /^\d+$/.test(draft) && Number(draft) > 0;
  return (
    <View style={styles.sheetForm}>
      <TextInput
        error={valid ? undefined : "Enter a positive whole number of seconds."}
        keyboardType="number-pad"
        label="Default rest duration in seconds"
        onChangeText={setDraft}
        value={draft}
      />
      <PrimaryButton
        disabled={saving || !valid || Number(draft) === value}
        label="Save Default Rest"
        loading={saving}
        onPress={() => { void onSave(Number(draft)); }}
      />
    </View>
  );
}

function PreferenceSaveError() {
  return (
    <AppText accessibilityRole="alert" style={styles.error}>
      Your training preference could not be saved. Nothing else was changed.
    </AppText>
  );
}

function accountInitial(email: string | undefined): string {
  return email?.trim().charAt(0).toUpperCase() || "H";
}

function formatRestDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
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
  avatar: {
    alignItems: "center",
    backgroundColor: colors.accent.soft,
    borderRadius: radius.panel,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: { color: colors.accent.primary },
  centered: { alignItems: "center", justifyContent: "center" },
  container: {
    backgroundColor: colors.background.primary,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.xl,
    paddingTop: spacing.xl,
  },
  error: { color: colors.semantic.error },
  identity: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  identityCopy: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.sm },
  selectionList: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  settingsGroup: {
    backgroundColor: colors.surface.primary,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  sheetForm: { gap: spacing.md },
  unitsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
});
