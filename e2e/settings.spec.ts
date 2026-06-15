import { expect, test } from '@playwright/test';

test('switches language to English', async ({ page }) => {
  await page.goto('/settings');

  const englishButton = page.getByRole('button', { name: 'English' });
  await expect(englishButton).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Налаштування', level: 2 })).toBeVisible();

  await englishButton.click();

  await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toBeVisible();
  await expect(englishButton).toHaveAttribute('aria-pressed', 'true');
});
