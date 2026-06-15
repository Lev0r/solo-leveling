import { expect, test } from '@playwright/test';

test('shows brand and Google sign-in when signed out', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Solo Leveling' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Увійти через Google' })).toBeVisible({
    timeout: 15000,
  });
});
