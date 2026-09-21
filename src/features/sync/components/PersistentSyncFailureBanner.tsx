import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { SecondaryButton } from "@/components/SecondaryButton";
import { colors, spacing } from "@/theme";

import { useSyncStatus } from "./SyncStatusProvider";

export function PersistentSyncFailureBanner() {
  const { failed, retry, retrying } = useSyncStatus();
  if (!failed) return null;

  return (
    <Card accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.card}>
      <View style={styles.copy}>
        <AppText variant="sectionHeading">Couldn&apos;t sync workout</AppText>
        <AppText color="secondary">Your workout is saved on this device.</AppText>
      </View>
      <SecondaryButton
        label="Retry"
        loading={retrying}
        onPress={() => { void retry(); }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: colors.semantic.error, gap: spacing.md },
  copy: { gap: spacing.xs },
});
