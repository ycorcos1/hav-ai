import * as Haptics from "expo-haptics";

export async function triggerSetCompletionHaptic(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Local persistence is authoritative; feedback must never reverse a saved set.
  }
}
