import { StyleSheet, Text, View } from 'react-native';

export default function CoachRoute() {
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
