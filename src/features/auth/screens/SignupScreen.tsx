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
  validateSignupFields,
  type SignupFieldErrors,
} from '@/features/auth/validation';
import { authService } from '@/lib/supabase/services';
import { spacing } from '@/theme';

export function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const submit = async () => {
    if (isSubmitting) return;

    const errors = validateSignupFields(email, password, confirmPassword);
    setFieldErrors(errors);
    setFormError(undefined);

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    try {
      const result = await authService.signUp({
        email: email.trim(),
        password,
      });

      if (result.session) {
        router.replace('/');
      } else {
        setConfirmationVisible(true);
      }
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmationVisible) {
    return (
      <Screen
        accessibilityLabel="Confirm your email"
        contentContainerStyle={styles.confirmation}
      >
        <View style={styles.header}>
          <AppText variant="screenTitle">Check your email</AppText>
          <AppText color="secondary">
            Check your email to confirm your account.
          </AppText>
        </View>
        <TextButton label="Log In" onPress={() => router.replace('/(auth)/login')} />
      </Screen>
    );
  }

  return (
    <Screen
      accessibilityLabel="Create your havAI account"
      contentContainerStyle={styles.content}
      scroll
    >
      <View style={styles.header}>
        <AppText variant="screenTitle">Create your account</AppText>
        <AppText color="secondary">Start tracking your training with havAI.</AppText>
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
          autoComplete="new-password"
          error={fieldErrors.password}
          label="Password"
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          value={password}
        />
        <TextInput
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          label="Confirm password"
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />
        {formError ? (
          <AppText accessibilityRole="alert" color="secondary">
            {formError}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Create Account"
          loading={isSubmitting}
          onPress={submit}
        />
        <TextButton
          label="Already have an account? Log In"
          onPress={() => router.replace('/(auth)/login')}
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
  confirmation: {
    gap: spacing.xxl,
    justifyContent: 'center',
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
