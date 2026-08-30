import type { EnsureProfileDependencies } from '@/features/profile/useCases/ensureProfile';
import { SupabaseProfileRepository } from '@/lib/supabase/repositories';
import { SupabaseAuthService } from '@/lib/supabase/services';

export const rootRoutingDependencies: EnsureProfileDependencies = {
  authService: new SupabaseAuthService(),
  profileRepository: new SupabaseProfileRepository(),
};
