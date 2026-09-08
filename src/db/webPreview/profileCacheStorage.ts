import type { UserProfile } from "@/shared/contracts";

import {
  browserWebPreviewStorage,
  type WebPreviewStorage,
  webPreviewStoragePrefix,
} from "./storage";

export const profileCacheWebPreviewStorageKey = `${webPreviewStoragePrefix}profile-cache:v1`;

type ProfileCacheWebPreviewState = {
  profiles: UserProfile[];
  version: 1;
};

export function readProfileCacheWebPreviewState(
  storage: WebPreviewStorage = browserWebPreviewStorage(),
): ProfileCacheWebPreviewState {
  const serialized = storage.getItem(profileCacheWebPreviewStorageKey);
  if (!serialized) return { profiles: [], version: 1 };

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isState(parsed)) throw new Error("Invalid profile cache preview state.");
    return parsed;
  } catch {
    throw new Error("The development profile cache could not be read.");
  }
}

export function writeProfileCacheWebPreviewState(
  storage: WebPreviewStorage,
  state: ProfileCacheWebPreviewState,
): void {
  try {
    storage.setItem(profileCacheWebPreviewStorageKey, JSON.stringify(state));
  } catch {
    throw new Error("The development profile cache could not be saved.");
  }
}

function isState(value: unknown): value is ProfileCacheWebPreviewState {
  return isRecord(value)
    && value.version === 1
    && Array.isArray(value.profiles)
    && value.profiles.every(isProfile);
}

function isProfile(value: unknown): value is UserProfile {
  return isRecord(value)
    && typeof value.userId === "string"
    && (value.displayName === undefined || typeof value.displayName === "string")
    && (value.weightUnit === "lb" || value.weightUnit === "kg")
    && ["strength", "hypertrophy", "hybrid"].includes(String(value.primaryGoal))
    && ["hidden", "optional", "preferred"].includes(String(value.rpePreference))
    && ["conservative", "balanced", "aggressive"].includes(String(value.progressionStyle))
    && typeof value.defaultRestDurationSeconds === "number"
    && value.defaultRestDurationSeconds > 0
    && typeof value.onboardingCompleted === "boolean"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
