import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';

export function HomeScreen() {
  return (
    <Screen contentContainerStyle={styles.container}>
      <AppText variant="screenTitle">Home</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
