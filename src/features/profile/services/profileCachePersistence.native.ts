import { bootstrapLocalDatabase } from "@/db";
import { SQLiteLocalProfileCacheRepository } from "@/db/repositories";
import type { LocalProfileCacheRepository } from "@/db/repositories/types";

export type ProfileCachePersistence = {
  profileCacheRepository: LocalProfileCacheRepository;
};

export async function createProfileCachePersistence(): Promise<ProfileCachePersistence> {
  const database = await bootstrapLocalDatabase();
  return {
    profileCacheRepository: new SQLiteLocalProfileCacheRepository(database),
  };
}
