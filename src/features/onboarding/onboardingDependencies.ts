import { CachedProfileRepository } from '@/features/profile/services/CachedProfileRepository';
import { SupabaseProfileRepository } from '@/lib/supabase/repositories';

export const onboardingDependencies = {
  profileRepository: new CachedProfileRepository(new SupabaseProfileRepository()),
};
