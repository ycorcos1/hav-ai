import { useCallback, useEffect, useState } from 'react';

import {
  ensureProfile,
  type EnsureProfileDependencies,
} from '@/features/profile/useCases/ensureProfile';
import type { AuthSession } from '@/shared/contracts';

import type { RootRoutingState } from './resolveRootRoute';

export function useRootRoutingState(dependencies: EnsureProfileDependencies): {
  retry: () => void;
  state: RootRoutingState;
} {
  const [state, setState] = useState<RootRoutingState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { authService, profileRepository } = dependencies;

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let authEventRevision = 0;
    let resolutionGeneration = 0;
    const startupAuthEventRevision = authEventRevision;

    const resolveSession = (session: AuthSession | null) => {
      const generation = ++resolutionGeneration;

      if (!session) {
        if (active) setState({ status: 'unauthenticated' });
        return;
      }

      if (active) setState({ status: 'loading' });

      void ensureProfile({ authService, profileRepository }).then(
        (profile) => {
          if (!active || generation !== resolutionGeneration) return;

          setState({
            status: 'authenticated',
            onboardingComplete: profile.onboardingCompleted,
          });
        },
        () => {
          if (!active || generation !== resolutionGeneration) return;

          setState({ status: 'error' });
        },
      );
    };

    let unsubscribe = () => {};

    try {
      unsubscribe = authService.subscribeToSession((session) => {
        authEventRevision += 1;
        resolveSession(session);
      });
    } catch {
      void Promise.resolve().then(() => {
        if (active) setState({ status: 'error' });
      });
      return () => {
        active = false;
        resolutionGeneration += 1;
      };
    }

    void authService.getSession().then(
      (session) => {
        if (!active || authEventRevision !== startupAuthEventRevision) return;

        resolveSession(session);
      },
      () => {
        if (!active || authEventRevision !== startupAuthEventRevision) return;

        resolutionGeneration += 1;
        setState({ status: 'error' });
      },
    );

    return () => {
      active = false;
      resolutionGeneration += 1;
      unsubscribe();
    };
  }, [attempt, authService, profileRepository]);

  return { retry, state };
}
