import { expect, test } from '@playwright/test';

test('home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Smart Cash/i);
  await expect(page.getByRole('link', { name: /تسجيل الدخول/i })).toBeVisible();
});

test('dashboard requires authentication', async ({ page }) => {
  await page.goto('/dashboard/home');
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('auth pages load', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: /مرحباً بعودتك/i })).toBeVisible();
  await expect(page.getByPlaceholder('example@company.com')).toBeVisible();
  await page.goto('/auth/register');
  await expect(page.getByRole('heading', { name: /أنشئ حسابك/i })).toBeVisible();
});
