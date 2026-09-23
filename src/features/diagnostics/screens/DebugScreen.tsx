import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import type { AIDiagnosticsV1, SyncQueueItem } from "@/shared/contracts";
import { useNetworkStatus } from "@/features/network/components/NetworkStatusProvider";
import type { DevelopmentNetworkStatusService } from "@/features/network/developmentNetworkStatus";
import { useSyncStatus } from "@/features/sync/components/SyncStatusProvider";
import { colors, spacing } from "@/theme";

import type { LocalDiagnostics } from "../services/diagnosticsApplication";

export type DebugScreenProps = {
  appVersion: string;
  environmentName: string;
  loadAIDiagnostics: () => Promise<AIDiagnosticsV1>;
  loadDiagnostics: () => Promise<LocalDiagnostics>;
  networkControls: DevelopmentNetworkStatusService;
  onBack?: () => void;
};

export function DebugScreen({
  appVersion,
  environmentName,
  loadAIDiagnostics,
  loadDiagnostics,
  networkControls,
  onBack,
}: DebugScreenProps) {
  const networkState = useNetworkStatus();
  const sync = useSyncStatus();
  const [diagnostics, setDiagnostics] = useState<LocalDiagnostics>();
  const [ai, setAI] = useState<AIDiagnosticsV1>();
  const [failed, setFailed] = useState(false);
  const [aiFailed, setAIFailed] = useState(false);
  const [queueVisible, setQueueVisible] = useState(false);
  const [simulatingOffline, setSimulatingOffline] = useState(
    networkControls.isSimulatingOffline(),
  );

  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      setDiagnostics(await loadDiagnostics());
    } catch {
      setFailed(true);
    }
  }, [loadDiagnostics]);

  useEffect(() => {
    void loadDiagnostics().then(
      (result) => setDiagnostics(result),
      () => setFailed(true),
    );
    void loadAIDiagnostics().then(
      (result) => { setAI(result); setAIFailed(false); },
      () => setAIFailed(true),
    );
  }, [loadAIDiagnostics, loadDiagnostics]);

  async function forceSync(): Promise<void> {
    await sync.retry();
    await refresh();
  }

  async function toggleOfflineSimulation(): Promise<void> {
    const next = !simulatingOffline;
    await networkControls.setSimulatedOffline(next);
    setSimulatingOffline(next);
  }

  if (failed) {
    return (
      <Screen contentContainerStyle={styles.centered} navigationAction={onBack ? { onBack } : undefined}>
        <ErrorState
          action={<SecondaryButton label="Try Again" onPress={() => { void refresh(); }} />}
          message="Local diagnostics could not be read. No data was changed."
          title="Diagnostics unavailable"
        />
      </Screen>
    );
  }
  if (!diagnostics) {
    return (
      <Screen accessibilityLabel="Loading diagnostics" contentContainerStyle={styles.centered} navigationAction={onBack ? { onBack } : undefined}>
        <ActivityIndicator color={colors.accent.primary} />
      </Screen>
    );
  }

  return (
    <Screen accessibilityLabel="Developer diagnostics" contentContainerStyle={styles.container} navigationAction={onBack ? { onBack } : undefined} scroll>
      <AppText variant="screenTitle">Developer Diagnostics</AppText>
      <AppText color="muted">Development-only, read-only unless an action is explicitly selected.</AppText>

      <Card style={styles.card}>
        <AppText variant="sectionHeading">Application</AppText>
        <DiagnosticRow label="Environment" value={environmentName} />
        <DiagnosticRow label="App version" value={appVersion} />
        <DiagnosticRow label="SQLite schema version" value={diagnostics.schemaVersion} />
        <DiagnosticRow label="User ID" value={diagnostics.userId} />
        <DiagnosticRow label="Active workout ID" value={diagnostics.activeWorkoutId ?? "None"} />
      </Card>

      <Card style={styles.card}>
        <AppText variant="sectionHeading">Connectivity and Sync</AppText>
        <DiagnosticRow label="Network state" value={networkState} />
        <DiagnosticRow label="Pending sync count" value={String(diagnostics.pendingItems.length)} />
        <DiagnosticRow label="Last successful sync" value={sync.lastSuccessfulSyncAt ?? "Not this session"} />
        <SecondaryButton
          disabled={sync.retrying}
          label={sync.retrying ? "Syncing..." : "Force Sync"}
          onPress={() => { void forceSync(); }}
        />
        <SecondaryButton
          label={simulatingOffline ? "Stop Simulating Offline" : "Simulate Offline"}
          onPress={() => { void toggleOfflineSimulation(); }}
        />
        <SecondaryButton
          label={queueVisible ? "Hide Sync Queue" : "View Sync Queue"}
          onPress={() => setQueueVisible((visible) => !visible)}
        />
        {queueVisible ? <SyncQueue items={diagnostics.pendingItems} /> : null}
      </Card>

      <Card style={styles.card}>
        <AppText variant="sectionHeading">Mock AI Diagnostics</AppText>
        {ai ? (
          <>
            <DiagnosticRow label="AI provider" value={ai.provider} />
            <DiagnosticRow label="Coach model" value={ai.models.coach} />
            <DiagnosticRow label="Coach prompt" value={ai.promptVersions.coach} />
            <DiagnosticRow label="Explanation prompt" value={ai.promptVersions.explanation} />
            <DiagnosticRow label="Parser prompt" value={ai.promptVersions.parser} />
          </>
        ) : (
          <AppText color="muted">
            {aiFailed ? "AI diagnostics unavailable." : "Loading AI diagnostics..."}
          </AppText>
        )}
      </Card>
    </Screen>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <View accessibilityLabel={`${label}: ${value}`} style={styles.row}>
      <AppText color="secondary" variant="metadata">{label.toUpperCase()}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

function SyncQueue({ items }: { items: readonly SyncQueueItem[] }) {
  return (
    <View accessibilityLabel="Sync queue" style={styles.queue}>
      {items.length === 0 ? <AppText color="muted">Queue is empty.</AppText> : null}
      {items.map((item) => (
        <View key={item.id} style={styles.queueItem}>
          <AppText variant="exerciseName">{item.entityType} · {item.operation}</AppText>
          <AppText color="secondary" variant="metadata">Entity {item.entityId}</AppText>
          <AppText color="secondary" variant="metadata">Attempts {item.attemptCount}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  centered: { alignItems: "center", justifyContent: "center" },
  container: { gap: spacing.lg, paddingBottom: spacing.xxxl, paddingTop: spacing.xl },
  queue: { gap: spacing.sm },
  queueItem: { gap: spacing.xs },
  row: { gap: spacing.xs },
});
