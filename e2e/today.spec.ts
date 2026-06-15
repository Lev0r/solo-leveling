import { expect, test } from '@playwright/test';

test('shows today workout from the default routine', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Ноги та тягові|Жими та балістика|Відновлення/ })).toBeVisible();
  await expect(page.getByText('Суглобова розминка')).toBeVisible();
});
