import { StyleSheet, Text, View } from 'react-native';

export function WorkoutsScreen() {
  return (
    <View style={styles.container}>
      <Text>Workouts</Text>
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
