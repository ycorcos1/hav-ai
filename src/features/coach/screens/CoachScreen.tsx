import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from "react-native";

import { AppText } from "@/components/AppText";
import { CompactButton } from "@/components/CompactButton";
import { GroupedSurface } from "@/components/GroupedSurface";
import { Screen } from "@/components/Screen";
import { coachApi, type CoachApi } from "@/features/ai/api";
import { useNetworkStatus } from "@/features/network/components/NetworkStatusProvider";
import type { CoachMessage, CoachRequestV1 } from "@/shared/contracts";
import { colors, radius, sizing, spacing, typography } from "@/theme";

export const coachSuggestedPrompts = [
  "What should I focus on today?",
  "Why has my incline bench stalled?",
  "How has my squat progressed?",
] as const;

const MAX_CONVERSATION_MESSAGES = 12;

export type CoachScreenProps = {
  activeContext?: CoachRequestV1["context"];
  activeContextLabel?: string;
  api?: CoachApi;
  createId?: () => string;
  now?: () => string;
  onClose?: () => void;
};

export function CoachScreen({
  activeContext,
  activeContextLabel,
  api = coachApi,
  createId = createMessageId,
  now = () => new Date().toISOString(),
  onClose,
}: CoachScreenProps) {
  const networkStatus = useNetworkStatus();
  const offline = networkStatus === "offline";
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>();
  const [failedMessage, setFailedMessage] = useState<string>();
  const unavailable = Boolean(failedMessage);

  async function requestAnswer(userMessage: string, conversation: CoachMessage[]): Promise<void> {
    setPendingMessage(userMessage);
    setFailedMessage(undefined);
    try {
      const response = await api.ask({
        message: userMessage,
        ...(activeContext ? { context: activeContext } : {}),
        ...(conversation.length > 0 ? {
          conversation: {
            messages: conversation.slice(-MAX_CONVERSATION_MESSAGES).map(({ role, content }) => ({
              role,
              content,
            })),
          },
        } : {}),
      });
      setMessages((current) => [...current, {
        id: createId(),
        role: "assistant",
        content: response.answer,
        createdAt: now(),
      }]);
    } catch {
      setFailedMessage(userMessage);
    } finally {
      setPendingMessage(undefined);
    }
  }

  async function send(): Promise<void> {
    const normalized = message.trim();
    if (!normalized || pendingMessage || offline) return;
    const userMessage: CoachMessage = {
      id: createId(),
      role: "user",
      content: normalized,
      createdAt: now(),
    };
    const conversation = messages.slice(-MAX_CONVERSATION_MESSAGES);
    setMessages((current) => [...current, userMessage]);
    setMessage("");
    await requestAnswer(normalized, conversation);
  }

  async function retry(): Promise<void> {
    if (!failedMessage || pendingMessage) return;
    const conversation = messages
      .slice(0, -1)
      .slice(-MAX_CONVERSATION_MESSAGES);
    await requestAnswer(failedMessage, conversation);
  }

  return (
    <Screen
      contentContainerStyle={styles.container}
      keyboardAware
      navigationAction={onClose ? { onBack: onClose } : undefined}
      scroll
    >
      <AppText color="secondary" variant="metadata">HAVAI COACH</AppText>
      {activeContextLabel ? <AppText color="secondary">{activeContextLabel}</AppText> : null}
      {messages.length === 0 ? (
        <>
          <View style={styles.header}>
            <AppText variant="screenTitle">What do you want to know?</AppText>
            <AppText color="secondary">
              Ask about your training, recent performance, or next steps.
            </AppText>
          </View>
          <View accessibilityLabel="Suggested Coach prompts" style={styles.prompts}>
            {coachSuggestedPrompts.map((prompt) => (
              <PromptChip
                disabled={offline}
                key={prompt}
                label={prompt}
                onPress={() => setMessage(prompt)}
              />
            ))}
          </View>
        </>
      ) : (
        <View accessibilityLabel="Coach conversation" style={styles.conversation}>
          {messages.map((item) => (
            <View
              accessibilityLabel={`${item.role === "user" ? "You" : "havAI Coach"}: ${item.content}`}
              key={item.id}
              style={[styles.message, item.role === "user" ? styles.userMessage : styles.assistantMessage]}
            >
              <AppText color="muted" variant="metadata">
                {item.role === "user" ? "YOU" : "HAVAI COACH"}
              </AppText>
              <AppText>{item.content}</AppText>
            </View>
          ))}
        </View>
      )}

      {pendingMessage ? (
        <View accessibilityLabel="Coach response loading" accessibilityState={{ busy: true }} style={styles.thinking}>
          <ActivityIndicator color={colors.accent.primary} size="small" />
          <AppText color="secondary">Reviewing your training context...</AppText>
        </View>
      ) : null}
      {offline ? (
        <GroupedSurface accessibilityRole="alert" style={styles.statusPanel}>
          <AppText variant="exerciseName">Coach requires an internet connection.</AppText>
          <AppText color="secondary">Your workout and manual logging remain available.</AppText>
        </GroupedSurface>
      ) : null}
      {failedMessage ? (
        <GroupedSurface accessibilityRole="alert" style={styles.statusPanel}>
          <AppText style={styles.failureTitle} variant="exerciseName">
            Coach is unavailable right now.
          </AppText>
          <AppText color="secondary">Your training data is unaffected.</AppText>
          <View style={styles.retryAction}>
            <CompactButton label="Retry" onPress={() => { void retry(); }} tone="quiet" />
          </View>
        </GroupedSurface>
      ) : null}

      <View style={[styles.composer, (offline || unavailable) && styles.composerDisabled]}>
        <NativeTextInput
          accessibilityLabel="Ask havAI"
          accessibilityState={{ disabled: offline || unavailable }}
          editable={!offline && !unavailable}
          maxLength={2000}
          multiline
          onChangeText={setMessage}
          placeholder="Ask havAI..."
          placeholderTextColor={colors.text.muted}
          selectionColor={colors.accent.primary}
          style={styles.composerInput}
          value={message}
        />
        <Pressable
          accessibilityLabel="Send"
          accessibilityRole="button"
          accessibilityState={{
            busy: Boolean(pendingMessage),
            disabled: offline || unavailable || !message.trim() || Boolean(pendingMessage),
          }}
          disabled={offline || unavailable || !message.trim() || Boolean(pendingMessage)}
          onPress={() => { void send(); }}
          style={({ pressed }) => [
            styles.send,
            pressed && styles.sendPressed,
            (offline || unavailable || !message.trim() || Boolean(pendingMessage)) && styles.sendDisabled,
          ]}
        >
          {pendingMessage ? (
            <ActivityIndicator color={colors.background.primary} size="small" />
          ) : (
            <AppText accessibilityElementsHidden style={styles.sendIcon}>↑</AppText>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.xl,
    paddingTop: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  prompts: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  promptChip: {
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.default,
    borderRadius: radius.panel,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: sizing.minimumTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  promptPressed: {
    backgroundColor: colors.accent.soft,
    borderColor: colors.accent.primary,
  },
  promptDisabled: {
    opacity: 0.55,
  },
  conversation: {
    gap: spacing.md,
  },
  message: {
    gap: spacing.sm,
    maxWidth: "86%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent.soft,
    borderRadius: radius.panel,
    borderBottomRightRadius: radius.control,
  },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface.primary,
    borderRadius: radius.panel,
    borderBottomLeftRadius: radius.control,
  },
  failureTitle: {
    color: colors.semantic.error,
  },
  statusPanel: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  retryAction: {
    alignItems: "flex-start",
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: colors.surface.primary,
    borderColor: colors.border.default,
    borderRadius: radius.panel,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: "auto",
    padding: spacing.xs,
    paddingLeft: spacing.lg,
  },
  composerDisabled: {
    opacity: 0.6,
  },
  composerInput: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    maxHeight: 112,
    minHeight: sizing.minimumTouchTarget,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  send: {
    alignItems: "center",
    backgroundColor: colors.accent.primary,
    borderRadius: sizing.minimumTouchTarget / 2,
    height: sizing.minimumTouchTarget,
    justifyContent: "center",
    width: sizing.minimumTouchTarget,
  },
  sendPressed: {
    backgroundColor: colors.accent.pressed,
  },
  sendDisabled: {
    backgroundColor: colors.surface.elevated,
  },
  sendIcon: {
    color: colors.background.primary,
    fontSize: 22,
    lineHeight: 24,
  },
  thinking: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});

function PromptChip({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.promptChip,
        pressed && !disabled && styles.promptPressed,
        disabled && styles.promptDisabled,
      ]}
    >
      <AppText color={disabled ? "muted" : "secondary"}>{label}</AppText>
    </Pressable>
  );
}

function createMessageId(): string {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `coach-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
