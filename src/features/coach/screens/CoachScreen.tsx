import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SecondaryButton } from "@/components/SecondaryButton";
import { TextButton } from "@/components/TextButton";
import { TextInput } from "@/components/TextInput";
import { coachApi, type CoachApi } from "@/features/ai/api";
import type { CoachMessage } from "@/shared/contracts";
import { colors, spacing } from "@/theme";

export const coachSuggestedPrompts = [
  "What should I focus on today?",
  "Why has my incline bench stalled?",
  "How has my squat progressed?",
] as const;

const MAX_CONVERSATION_MESSAGES = 12;

export type CoachScreenProps = {
  api?: CoachApi;
  createId?: () => string;
  now?: () => string;
};

export function CoachScreen({
  api = coachApi,
  createId = createMessageId,
  now = () => new Date().toISOString(),
}: CoachScreenProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>();
  const [failedMessage, setFailedMessage] = useState<string>();

  async function requestAnswer(userMessage: string, conversation: CoachMessage[]): Promise<void> {
    setPendingMessage(userMessage);
    setFailedMessage(undefined);
    try {
      const response = await api.ask({
        message: userMessage,
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
    if (!normalized || pendingMessage) return;
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
    <Screen contentContainerStyle={styles.container} scroll>
      <AppText color="secondary" variant="metadata">HAVAI COACH</AppText>
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
              <SecondaryButton
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
            <Card
              accessibilityLabel={`${item.role === "user" ? "You" : "havAI Coach"}: ${item.content}`}
              key={item.id}
              style={[styles.message, item.role === "user" ? styles.userMessage : styles.assistantMessage]}
            >
              <AppText color="muted" variant="metadata">
                {item.role === "user" ? "YOU" : "HAVAI COACH"}
              </AppText>
              <AppText>{item.content}</AppText>
            </Card>
          ))}
        </View>
      )}

      {pendingMessage ? (
        <View accessibilityLabel="Coach response loading" accessibilityState={{ busy: true }}>
          <AppText color="secondary">Reviewing your training context...</AppText>
        </View>
      ) : null}
      {failedMessage ? (
        <View accessibilityRole="alert" style={styles.failure}>
          <AppText style={styles.failureTitle} variant="exerciseName">
            Coach is unavailable right now.
          </AppText>
          <AppText color="secondary">Your training data is unaffected.</AppText>
          <TextButton label="Retry" onPress={() => { void retry(); }} />
        </View>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Ask havAI"
          multiline
          onChangeText={setMessage}
          placeholder="Ask havAI..."
          value={message}
        />
        <PrimaryButton
          disabled={!message.trim() || Boolean(pendingMessage)}
          label="Send"
          loading={Boolean(pendingMessage)}
          onPress={() => { void send(); }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  prompts: {
    gap: spacing.md,
  },
  conversation: {
    gap: spacing.md,
  },
  message: {
    gap: spacing.sm,
    maxWidth: "88%",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent.soft,
  },
  assistantMessage: {
    alignSelf: "flex-start",
  },
  failure: {
    gap: spacing.sm,
  },
  failureTitle: {
    color: colors.semantic.error,
  },
  composer: {
    gap: spacing.md,
    marginTop: "auto",
  },
});

function createMessageId(): string {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `coach-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
