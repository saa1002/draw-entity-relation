import { test, expect } from '@playwright/test';

import {
    addAttributeToSelectedEntity,
    addEntity,
    expectSavedEntityAttributeToMatch,
    getSavedEntity,
    selectEntity,
    renameElement,
} from '../helpers/canvas';

import { seedSavedDiagram } from '../helpers/persistence';

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

test('hide/show attributes also affects nested attribute trees', async ({ page }) => {
    const diagram = {
        entities: [
            {
                idMx: '10',
                name: 'Documento',
                position: { x: 100, y: 100 },
                weak: false,
                ownerEntityId: null,
                identifyingRelationId: null,
                attributes: [
                    {
                        idMx: '20',
                        name: 'codigo',
                        position: { x: 220, y: 100 },
                        key: true,
                        partialKey: false,
                        cell: ['20', 'edge_attr_codigo'],
                        offsetX: 120,
                        offsetY: 0,
                        children: [
                            {
                                idMx: '21',
                                name: 'serie',
                                position: { x: 340, y: 70 },
                                key: false,
                                partialKey: false,
                                cell: ['21', 'edge_attr_serie'],
                                offsetX: 120,
                                offsetY: -30,
                            },
                            {
                                idMx: '22',
                                name: 'numero',
                                position: { x: 340, y: 130 },
                                key: false,
                                partialKey: false,
                                cell: ['22', 'edge_attr_numero'],
                                offsetX: 120,
                                offsetY: 30,
                            },
                        ],
                    },
                ],
            },
        ],
        relations: [],
    };

    await seedSavedDiagram(page, diagram);

    await page.goto('/');

    await expect(page.getByText('codigo', { exact: true })).toBeVisible();
    await expect(page.getByText('serie', { exact: true })).toBeVisible();
    await expect(page.getByText('numero', { exact: true })).toBeVisible();

    await selectEntity(page, 'Documento');

    await page
        .getByRole('button', { name: 'Ocultar atributos' })
        .click();

    await expect(page.getByText('codigo', { exact: true })).toBeHidden();
    await expect(page.getByText('serie', { exact: true })).toBeHidden();
    await expect(page.getByText('numero', { exact: true })).toBeHidden();

    await page
        .getByRole('button', { name: 'Mostrar atributos' })
        .click();

    await expect(page.getByText('codigo', { exact: true })).toBeVisible();
    await expect(page.getByText('serie', { exact: true })).toBeVisible();
    await expect(page.getByText('numero', { exact: true })).toBeVisible();
});

test('add child attributes to an existing attribute', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await renameElement(page, 'Atributo', 'codigo');

    await page.getByText('codigo', { exact: true }).click();
    await page.getByRole('button', { name: 'Añadir subatributo' }).click();

    await expect(page.getByText('Subatributo insertado').last()).toBeVisible();
    await expect(page.getByText('Atributo', { exact: true })).toBeVisible();

    await renameElement(page, 'Atributo', 'serie');

    await expect
        .poll(async () => {
            const entity = await getSavedEntity(page, 'Entidad');

            return entity?.attributes?.[0]?.children?.map(
                (attribute) => attribute.name,
            );
        })
        .toEqual(['serie']);
});

test('create a composite attribute with multiple child attributes from the editor', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await renameElement(page, 'Atributo', 'codigo');

    await page.getByText('codigo', { exact: true }).click();

    await page.getByRole('button', { name: 'Añadir subatributo' }).click();
    await renameElement(page, 'Atributo', 'serie');

    await page.getByText('codigo', { exact: true }).click();

    await page.getByRole('button', { name: 'Añadir subatributo' }).click();
    await renameElement(page, 'Atributo', 'numero');

    await expect
        .poll(async () => {
            const entity = await getSavedEntity(page, 'Entidad');

            return entity?.attributes?.[0];
        })
        .toMatchObject({
            name: 'codigo',
            key: true,
            children: [
                {
                    name: 'serie',
                    key: false,
                    partialKey: false,
                },
                {
                    name: 'numero',
                    key: false,
                    partialKey: false,
                },
            ],
        });

    await expect(page.getByText('codigo', { exact: true })).toBeVisible();
    await expect(page.getByText('serie', { exact: true })).toBeVisible();
    await expect(page.getByText('numero', { exact: true })).toBeVisible();
});