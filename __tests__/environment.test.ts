import { validateEnvironment } from '@/lib/environment/validateEnvironment';

const validEnvironment = {
  appEnvironment: 'development',
  supabaseUrl: 'http://127.0.0.1:54321',
  supabasePublishableKey: 'test-publishable-key',
};

describe('environment validation', () => {
  it('returns typed client-safe configuration for valid values', () => {
    expect(validateEnvironment(validEnvironment)).toEqual({
      appEnvironment: 'development',
      supabaseUrl: 'http://127.0.0.1:54321',
      supabasePublishableKey: 'test-publishable-key',
    });
  });

  it('reports every missing required public variable clearly', () => {
    expect(() =>
      validateEnvironment({
        appEnvironment: undefined,
        supabaseUrl: undefined,
        supabasePublishableKey: undefined,
      }),
    ).toThrow(
      [
        'Invalid havAI environment configuration:',
        '- EXPO_PUBLIC_APP_ENV must be one of: development, preview, production.',
        '- EXPO_PUBLIC_SUPABASE_URL is required.',
        '- EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.',
      ].join('\n'),
    );
  });

  it('rejects unsupported environments and invalid Supabase URLs', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        appEnvironment: 'staging',
        supabaseUrl: 'not-a-url',
      }),
    ).toThrow('EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.');
  });
});
