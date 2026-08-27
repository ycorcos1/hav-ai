import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  resolveRootRoute,
  type RootRoutingState,
} from '@/features/routing/resolveRootRoute';

type RootRouteGuardProps = {
  state: RootRoutingState;
};

export function RootRouteGuard({ state }: RootRouteGuardProps) {
  const route = resolveRootRoute(state);

  if (route.status === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <Text>havAI</Text>
      </View>
    );
  }

  return <Redirect href={route.href} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
