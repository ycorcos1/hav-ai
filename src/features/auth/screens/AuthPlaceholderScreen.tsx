import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors } from '@/theme';

type AuthPlaceholderScreenProps = {
  title: string;
};

export function AuthPlaceholderScreen({ title }: AuthPlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <AppText variant="screenTitle">{title}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
  },
});
