import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import {
  resolveRootRoute,
  type RootRoutingState,
} from '@/features/routing/resolveRootRoute';
import { colors } from '@/theme';

type RootRouteGuardProps = {
  state: RootRoutingState;
};

export function RootRouteGuard({ state }: RootRouteGuardProps) {
  const route = resolveRootRoute(state);

  if (route.status === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <AppText variant="screenTitle">havAI</AppText>
      </View>
    );
  }

  return <Redirect href={route.href} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
  },
});
