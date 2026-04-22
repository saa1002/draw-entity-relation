import { test, expect } from '@playwright/test';

test('mxGraph transaction level stays balanced (updateLevel === 0)', async ({ page }) => {
    // Enable the app debug hook for Playwright
    await page.addInitScript(() => {
        window.__PW__ = true;
    });

    await page.goto('/');

    const canvas = page.locator('svg');

    const getUpdateLevel = async () =>
        page.evaluate(() => window.__DEBUG_GRAPH__?.getModel()?.updateLevel ?? null);

    // After initial setup/config, must not be inside an mxGraph transaction
    await expect(await getUpdateLevel()).toBe(0);

    // Typical operations (same style as existing tests)
    await page.getByRole('img').first().dragTo(canvas);
    await canvas.click();

    await page.getByText('Entidad').first().dblclick();
    await page.keyboard.type('Clientes');
    await canvas.click();

    // Must still be balanced after interactions
    await expect(await getUpdateLevel()).toBe(0);
});
