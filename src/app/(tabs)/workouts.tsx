import { StyleSheet, Text, View } from 'react-native';

export default function WorkoutsRoute() {
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
