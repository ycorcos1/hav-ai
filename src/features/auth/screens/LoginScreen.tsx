import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TextButton } from '@/components/TextButton';
import { TextInput } from '@/components/TextInput';
import { authErrorMessage } from '@/features/auth/authMessages';
import {
  validateLoginFields,
  type LoginFieldErrors,
} from '@/features/auth/validation';
import { authService } from '@/lib/supabase/services';
import { spacing } from '@/theme';

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (isSubmitting) return;

    const errors = validateLoginFields(email, password);
    setFieldErrors(errors);
    setFormError(undefined);

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    try {
      const result = await authService.signIn({
        email: email.trim(),
        password,
      });

      if (result.session) router.replace('/');
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen
      accessibilityLabel="Log in to havAI"
      contentContainerStyle={styles.content}
      scroll
    >
      <View style={styles.header}>
        <AppText variant="screenTitle">Log In</AppText>
        <AppText color="secondary">Continue your training journey with havAI.</AppText>
      </View>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={fieldErrors.email}
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />
        <TextInput
          autoComplete="current-password"
          error={fieldErrors.password}
          label="Password"
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          value={password}
        />
        {formError ? (
          <AppText accessibilityRole="alert" color="secondary">
            {formError}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Log In" loading={isSubmitting} onPress={submit} />
        <TextButton
          label="Need an account? Create Account"
          onPress={() => router.replace('/(auth)/signup')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xxxl,
  },
  header: {
    gap: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
});
