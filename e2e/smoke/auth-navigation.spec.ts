import { expect, test } from '@playwright/test';

test.describe('unauthenticated navigation', () => {
  test('@smoke exposes account entry points and client-side validation', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/');

    await expect(page.getByText('Welcome to havAI', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByLabel('Create your havAI account')).toBeVisible();

    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('Enter your email.')).toBeVisible();
    await expect(page.getByText('Enter a password.')).toBeVisible();
    await expect(page.getByText('Confirm your password.')).toBeVisible();

    await page.getByRole('button', { name: 'Go back' }).click();
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.getByLabel('Log in to havAI')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
