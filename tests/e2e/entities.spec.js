import { test, expect } from '@playwright/test';

import {
    addEntity,
    expectSavedEntityToMatch,
    renameElement,
} from '../helpers/canvas';

test('add an entity to the canvas and rename it', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);

    await expect(page.getByText('Entidad', { exact: true })).toBeVisible();

    await expectSavedEntityToMatch(page, 'Entidad', {
        name: 'Entidad',
    });

    await renameElement(page, 'Entidad', 'Clientes');

    await expect(page.getByText('Clientes', { exact: true })).toBeVisible();

    await expectSavedEntityToMatch(page, 'Clientes', {
        name: 'Clientes',
    });
});