import { defineConfig, devices } from '@playwright/test';

import { requireLoopbackUrl } from './e2e/helpers/environment';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8081';
const supabaseUrl = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabasePublishableKey =
  process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? 'e2e-local-publishable-key';

requireLoopbackUrl(baseURL, 'E2E_BASE_URL');
requireLoopbackUrl(supabaseUrl, 'E2E_SUPABASE_URL');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: 'npm run web -- --offline',
    env: {
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
      EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
