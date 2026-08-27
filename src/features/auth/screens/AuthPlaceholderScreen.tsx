import { StyleSheet, Text, View } from 'react-native';

export function AuthPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text>Auth</Text>
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
