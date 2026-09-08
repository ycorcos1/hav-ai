import type { EnsureProfileDependencies } from '@/features/profile/useCases/ensureProfile';
import { CachedProfileRepository } from '@/features/profile/services/CachedProfileRepository';
import { SupabaseProfileRepository } from '@/lib/supabase/repositories';
import { authService } from '@/lib/supabase/services';

export const rootRoutingDependencies: EnsureProfileDependencies = {
  authService,
  profileRepository: new CachedProfileRepository(new SupabaseProfileRepository()),
};
