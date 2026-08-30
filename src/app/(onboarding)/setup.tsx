import { onboardingDependencies } from '@/features/onboarding/onboardingDependencies';
import { OnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';

export default function SetupRoute() {
  return <OnboardingScreen {...onboardingDependencies} />;
}
