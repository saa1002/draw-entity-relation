import { test, expect } from '@playwright/test';

import {
    addAttributeToSelectedEntity,
    addEntity,
    addIsa,
    addRelation,
    expectSavedDiagramState,
    renameElement,
    selectEntity,
    selectIsa,
    selectRelation,
} from '../helpers/canvas';

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

test.describe('keyboard deletion', () => {
    test('delete selected entity with Delete key', async ({ page }) => {
        await page.goto('/');

        await addEntity(page, 'Entidad');
        await selectEntity(page, 'Entidad');

        await page.keyboard.press('Delete');

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.entities.map((entity) => entity.name),
            [],
        );
    });

    test('delete selected relation with Delete key', async ({ page }) => {
        await page.goto('/');

        await addRelation(page, 'Relación');
        await selectRelation(page, 'Relación');

        await page.keyboard.press('Delete');

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.relations.map((relation) => relation.name),
            [],
        );
    });

    test('delete selected non-key attribute with Delete key', async ({
        page,
    }) => {
        await page.goto('/');

        await addEntity(page, 'Entidad');

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);
        await renameElement(page, 'Atributo', 'id');

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);
        await renameElement(page, 'Atributo', 'nombre');

        await page.getByText('nombre', { exact: true }).click();

        await page.keyboard.press('Delete');

        await expectSavedDiagramState(
            page,
            (diagram) =>
                diagram.entities[0].attributes.map(
                    (attribute) => attribute.name,
                ),
            ['id'],
        );
    });

    test('delete selected ISA with Delete key', async ({ page }) => {
        await page.goto('/');

        await addIsa(page);
        await selectIsa(page);

        await page.keyboard.press('Delete');

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.isas.length,
            0,
        );
    });
});