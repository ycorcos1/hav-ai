import { SupabaseProfileRepository } from '@/lib/supabase/repositories';

export const onboardingDependencies = {
  profileRepository: new SupabaseProfileRepository(),
};
