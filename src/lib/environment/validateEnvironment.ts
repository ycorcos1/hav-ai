export type AppEnvironment = 'development' | 'preview' | 'production';

export type RawEnvironment = {
  appEnvironment: string | undefined;
  supabaseUrl: string | undefined;
  supabasePublishableKey: string | undefined;
};

export type Environment = {
  appEnvironment: AppEnvironment;
  supabaseUrl: string;
  supabasePublishableKey: string;
};

const appEnvironments: AppEnvironment[] = [
  'development',
  'preview',
  'production',
];

function isAppEnvironment(value: string): value is AppEnvironment {
  return appEnvironments.includes(value as AppEnvironment);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateEnvironment(raw: RawEnvironment): Environment {
  const appEnvironment = raw.appEnvironment?.trim() ?? '';
  const supabaseUrl = raw.supabaseUrl?.trim() ?? '';
  const supabasePublishableKey = raw.supabasePublishableKey?.trim() ?? '';
  const errors: string[] = [];

  if (!isAppEnvironment(appEnvironment)) {
    errors.push(
      'EXPO_PUBLIC_APP_ENV must be one of: development, preview, production.',
    );
  }

  if (!supabaseUrl) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is required.');
  } else if (!isHttpUrl(supabaseUrl)) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.');
  }

  if (!supabasePublishableKey) {
    errors.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid havAI environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }

  if (!isAppEnvironment(appEnvironment)) {
    throw new Error('Invalid havAI environment configuration.');
  }

  return {
    appEnvironment,
    supabaseUrl,
    supabasePublishableKey,
  };
}
