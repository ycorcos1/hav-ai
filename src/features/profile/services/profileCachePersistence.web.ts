import type { LocalProfileCacheRepository } from "@/db/repositories/types";
import { WebPreviewLocalProfileCacheRepository } from "@/db/webPreview/WebPreviewLocalProfileCacheRepository";

export type ProfileCachePersistence = {
  profileCacheRepository: LocalProfileCacheRepository;
};

export async function createProfileCachePersistence(): Promise<ProfileCachePersistence> {
  return {
    profileCacheRepository: new WebPreviewLocalProfileCacheRepository(),
  };
}
