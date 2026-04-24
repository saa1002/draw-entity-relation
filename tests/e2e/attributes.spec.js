import { test, expect } from '@playwright/test';

import {
    addAttributeToSelectedEntity,
    addEntity,
    expectSavedEntityAttributeToMatch,
    selectEntity,
    renameElement,
} from '../helpers/canvas';

test('add attributes to an entity', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');

    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
    });

    await renameElement(page, 'Atributo', 'Clave');

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Clave',
    });

    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
        name: 'Atributo',
    });
});

test('hide/show attributes', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await expect(page.getByText('Atributo', { exact: true })).toBeVisible();

    await selectEntity(page, 'Entidad');
    await page
        .getByRole('button', { name: 'Ocultar atributos' })
        .click();

    await expect(page.getByText('Atributo', { exact: true })).toBeHidden();

    await page
        .getByRole('button', { name: 'Mostrar atributos' })
        .click();

    await expect(page.getByText('Atributo', { exact: true })).toBeVisible();
});