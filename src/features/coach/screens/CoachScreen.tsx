import { StyleSheet, Text, View } from 'react-native';

export function CoachScreen() {
  return (
    <View style={styles.container}>
      <Text>Coach</Text>
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
