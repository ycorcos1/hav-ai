import type { LocalProfileCacheRepository } from "@/db/repositories/types";
import type { UserProfile } from "@/shared/contracts";

import { browserWebPreviewStorage, type WebPreviewStorage } from "./storage";
import {
  readProfileCacheWebPreviewState,
  writeProfileCacheWebPreviewState,
} from "./profileCacheStorage";

export class WebPreviewLocalProfileCacheRepository implements LocalProfileCacheRepository {
  constructor(private readonly storage: WebPreviewStorage = browserWebPreviewStorage()) {}

  async get(userId: string): Promise<UserProfile | null> {
    return readProfileCacheWebPreviewState(this.storage).profiles.find(
      (profile) => profile.userId === userId,
    ) ?? null;
  }

  async upsert(profile: UserProfile): Promise<void> {
    const state = readProfileCacheWebPreviewState(this.storage);
    const index = state.profiles.findIndex(({ userId }) => userId === profile.userId);
    if (index >= 0) state.profiles[index] = profile;
    else state.profiles.push(profile);
    writeProfileCacheWebPreviewState(this.storage, state);
  }
}
