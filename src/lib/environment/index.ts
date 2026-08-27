import { validateEnvironment } from './validateEnvironment';

export type { AppEnvironment, Environment } from './validateEnvironment';

export const environment = validateEnvironment({
  appEnvironment: process.env.EXPO_PUBLIC_APP_ENV,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
