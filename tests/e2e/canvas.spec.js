import { test, expect } from '@playwright/test';

import { addEntity, renameElement } from '../helpers/canvas';

test('mxGraph transaction level stays balanced (updateLevel === 0)', async ({ page }) => {
    await page.addInitScript(() => {
        window.__PW__ = true;
    });

    await page.goto('/');

    const getUpdateLevel = async () =>
        page.evaluate(
            () => window.__DEBUG_GRAPH__?.getModel()?.updateLevel ?? null,
        );

    await expect.poll(getUpdateLevel).toBe(0);

    await addEntity(page);
    await renameElement(page, 'Entidad', 'Clientes');

    await expect(page.getByText('Clientes', { exact: true })).toBeVisible();

    await expect.poll(getUpdateLevel).toBe(0);
});
