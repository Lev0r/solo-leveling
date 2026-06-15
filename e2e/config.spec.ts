import { expect, test } from '@playwright/test';

test('shows use-default routine action', async ({ page }) => {
  await page.goto('/config');

  await expect(page.getByRole('button', { name: 'Використати типову' })).toBeVisible();
});
