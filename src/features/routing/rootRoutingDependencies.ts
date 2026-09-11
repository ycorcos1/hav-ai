import type { RootRoutingDependencies } from './useRootRoutingState';
import { recoverLocalStartup } from './localRecovery';
import { CachedProfileRepository } from '@/features/profile/services/CachedProfileRepository';
import { SupabaseProfileRepository } from '@/lib/supabase/repositories';
import { authService } from '@/lib/supabase/services';

export const rootRoutingDependencies: RootRoutingDependencies = {
  authService,
  profileRepository: new CachedProfileRepository(new SupabaseProfileRepository()),
  recoverStartup: () => recoverLocalStartup(rootRoutingDependencies),
};
