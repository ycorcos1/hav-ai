import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { SecondaryButton } from '@/components/SecondaryButton';
import type { EnsureProfileDependencies } from '@/features/profile/useCases/ensureProfile';
import {
  resolvePersistentRootRoute,
} from '@/features/routing/resolveRootRoute';
import { useRootRoutingState } from '@/features/routing/useRootRoutingState';
import { colors } from '@/theme';

type RootRouteGuardProps = EnsureProfileDependencies & {
  children?: ReactNode;
  segments: readonly string[];
};

export function RootRouteGuard({
  children,
  segments,
  ...dependencies
}: RootRouteGuardProps) {
  const { retry, state } = useRootRoutingState(dependencies);
  const route = resolvePersistentRootRoute(state, segments);

  if (route.status === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <AppText variant="screenTitle">havAI</AppText>
      </View>
    );
  }

  if (route.status === 'error') {
    return (
      <Screen contentContainerStyle={styles.errorContainer}>
        <ErrorState
          action={<SecondaryButton label="Try Again" onPress={retry} />}
          message="Check your connection and try again."
          title="Couldn’t start havAI"
        />
      </Screen>
    );
  }

  if (route.status === 'allow') return children;

  return <Redirect href={route.href} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
  },
});
