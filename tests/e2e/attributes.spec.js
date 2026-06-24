import { test, expect } from '@playwright/test';

import {
    addAttributeToSelectedEntity,
    addEntity,
    enableMxGraphDebug,
    expectSavedEntityAttributeToMatch,
    getSavedEntity,
    renameElement,
    selectEntity,
} from '../helpers/canvas';

test.beforeEach(async ({ page }) => {
    await enableMxGraphDebug(page);
});

const findRootAttributeByName = (entity, attributeName) =>
    entity?.attributes?.find((attribute) => attribute.name === attributeName);

test.describe('basic entity attributes', () => {
    test('add attributes to an entity', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);
        await selectEntity(page, 'Entidad');

        await addAttributeToSelectedEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: true,
            partialKey: false,
        });

        await renameElement(page, 'Atributo', 'Clave');

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Clave',
        });

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 2, {
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

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: true,
            partialKey: false,
        });

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
        });

        await page.getByText('Atributo', { exact: true }).click();

        await page.getByRole('button', { name: 'Convertir en clave' }).click();

        await expect(
            page.getByText('Atributo marcado como clave').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: false,
            partialKey: false,
        });

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: true,
            partialKey: false,
        });

        await page.getByText('Atributo', { exact: true }).click();

        await page.getByRole('button', { name: 'Quitar clave' }).click();

        await expect(
            page.getByText('Clave eliminada del atributo').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
        });
    });

    test('toggle discriminant on an entity attribute', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: true,
            partialKey: false,
        });

        await selectEntity(page, 'Entidad');

        await page
            .getByRole('button', { name: 'Marcar como entidad débil' })
            .click();

        await expect(
            page.getByText('Entidad marcada como débil').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: false,
            partialKey: true,
        });

        await page.getByText('id', { exact: true }).click();

        await page
            .getByRole('button', { name: 'Quitar discriminante' })
            .click();

        await expect(
            page.getByText('Discriminante eliminado').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
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
            name: 'id',
            key: false,
            partialKey: true,
        });
    });
});

test.describe('multivalued attributes', () => {
    test('toggle simple multivalued attributes and persist across reloads', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await page.getByText('id', { exact: true }).click();

        await expect(
            page.getByRole('button', { name: 'Marcar multivaluado' }),
        ).toHaveCount(0);

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
        });

        await page.getByText('Atributo', { exact: true }).click();

        await page.getByRole('button', { name: 'Marcar multivaluado' }).click();

        await expect(
            page.getByText('Atributo marcado como multivaluado').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
            multivalued: true,
        });

        await expect(
            page.getByRole('button', { name: 'Quitar multivaluado' }),
        ).toBeVisible();

        await expect(
            page.getByRole('button', { name: 'Añadir subatributo hermano' }),
        ).toHaveCount(0);

        await page.reload();

        await expect(page.getByText('Atributo', { exact: true })).toBeVisible();

        await page.getByText('Atributo', { exact: true }).click();

        await expect(
            page.getByRole('button', { name: 'Quitar multivaluado' }),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
            multivalued: true,
        });

        await page.getByRole('button', { name: 'Quitar multivaluado' }).click();

        await expect(
            page.getByText('Multivaluado eliminado del atributo').last(),
        ).toBeVisible();

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');
                const attribute = findRootAttributeByName(entity, 'Atributo');

                return {
                    multivalued: attribute?.multivalued,
                    hasMultivaluedFlag: Object.prototype.hasOwnProperty.call(
                        attribute ?? {},
                        'multivalued',
                    ),
                };
            })
            .toEqual({
                multivalued: undefined,
                hasMultivaluedFlag: false,
            });
    });

    test('does not allow direct conversion of a simple multivalued entity attribute into a composite attribute', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);
        await renameElement(page, 'Atributo', 'telefonos');

        await page.getByText('telefonos', { exact: true }).click();
        await page.getByRole('button', { name: 'Marcar multivaluado' }).click();

        await expect(
            page.getByText('Atributo marcado como multivaluado').last(),
        ).toBeVisible();

        await expect(
            page.getByRole('button', { name: 'Añadir subatributo hermano' }),
        ).toHaveCount(0);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'telefonos',
            key: false,
            partialKey: false,
            multivalued: true,
        });

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');
                return entity?.attributes?.[1]?.children;
            })
            .toBeUndefined();

        await page.reload();

        await expect(page.getByText('telefonos', { exact: true })).toBeVisible();

        await page.getByText('telefonos', { exact: true }).click();

        await expect(
            page.getByRole('button', { name: 'Quitar multivaluado' }),
        ).toBeVisible();

        await expect(
            page.getByRole('button', { name: 'Añadir subatributo hermano' }),
        ).toHaveCount(0);
    });
});