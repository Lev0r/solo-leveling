import { expect, test } from '@playwright/test';

test('opens timer from a timed exercise card', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Запустити таймер для Скакалка' }).click();

  await expect(page.getByText('ГОТУЙСЯ')).toBeVisible();
  await expect(page.locator('.timer-screen__countdown')).toHaveText(/^[0-9]+$/);
});
