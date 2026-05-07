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

test('toggle primary key on an entity attribute', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: true,
        partialKey: false,
    });

    await page.getByText('Atributo', { exact: true }).click();

    await page.getByRole('button', { name: 'Quitar clave' }).click();

    await expect(
        page.getByText('Clave eliminada del atributo').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: false,
        partialKey: false,
    });

    await page.getByRole('button', { name: 'Convertir en clave' }).click();

    await expect(
        page.getByText('Atributo marcado como clave').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: true,
        partialKey: false,
    });
});

test('toggle discriminant on an entity attribute', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: true,
        partialKey: false,
    });

    // Convert the entity into a weak entity.
    // The previous primary key should become the discriminator.
    await selectEntity(page, 'Entidad');

    await page
        .getByRole('button', { name: 'Marcar como entidad débil' })
        .click();

    await expect(
        page.getByText('Entidad marcada como débil').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: false,
        partialKey: true,
    });

    await page.getByText('Atributo', { exact: true }).click();

    await page
        .getByRole('button', { name: 'Quitar discriminante' })
        .click();

    await expect(
        page.getByText('Discriminante eliminado').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: false,
        partialKey: false,
    });

    await page
        .getByRole('button', { name: 'Convertir en discriminante' })
        .click();

    await expect(
        page.getByText('Atributo marcado como discriminante').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: false,
        partialKey: true,
    });
});