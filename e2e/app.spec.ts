import { test, expect } from '@playwright/test';

test('should render the dashboard page', async ({ page }) => {
  await page.goto('http://localhost:1420/dashboard');
  await expect(page.locator('text=Queenzy LifeOS')).toBeVisible();
  await expect(page.locator('text=Dashboard')).toBeVisible();
});
