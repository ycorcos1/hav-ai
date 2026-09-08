import type { LocalProfileCacheRepository } from "@/db/repositories/types";
import type {
  CreateOwnProfileInput,
  ProfileRepository,
  UpdateOwnProfileInput,
} from "@/lib/supabase/repositories";
import type { UserProfile } from "@/shared/contracts";

import { createProfileCachePersistence } from "./profileCachePersistence";

type ProfileCacheFactory = () => Promise<LocalProfileCacheRepository>;

const defaultCacheFactory: ProfileCacheFactory = async () => (
  await createProfileCachePersistence()
).profileCacheRepository;

export class CachedProfileRepository implements ProfileRepository {
  constructor(
    private readonly remoteRepository: ProfileRepository,
    private readonly createCache: ProfileCacheFactory = defaultCacheFactory,
  ) {}

  async getOwnProfile(): Promise<UserProfile | null> {
    const profile = await this.remoteRepository.getOwnProfile();
    if (profile) await this.cache(profile);
    return profile;
  }

  async createOwnProfile(input: CreateOwnProfileInput): Promise<UserProfile> {
    const profile = await this.remoteRepository.createOwnProfile(input);
    await this.cache(profile);
    return profile;
  }

  async updateOwnProfile(input: UpdateOwnProfileInput): Promise<UserProfile> {
    const profile = await this.remoteRepository.updateOwnProfile(input);
    await this.cache(profile);
    return profile;
  }

  private async cache(profile: UserProfile): Promise<void> {
    const repository = await this.createCache();
    await repository.upsert(profile);
  }
}
