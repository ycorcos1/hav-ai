import { StyleSheet, Text, View } from 'react-native';

export function OnboardingPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text>Onboarding</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
