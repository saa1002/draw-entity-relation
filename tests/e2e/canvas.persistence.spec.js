import { test, expect } from '@playwright/test';

test('relation configuration persists after accept and survives reload', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('svg');
    const entidadIcono = page.locator('img[src="images/rectangle.png"]');
    const relacionIcono = page.locator('img[src="images/rhombus.png"]');

    // 1) Create 2 entities + 1 relationship
    await entidadIcono.dragTo(canvas);
    await entidadIcono.dragTo(canvas);
    await relacionIcono.dragTo(canvas);

    // 2) Open relation configuration modal
    await page.getByText('Relación', { exact: true }).click();
    await page.getByRole('button', { name: 'Configurar relación' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Configurar relación')).toBeVisible();

    // 3) Configure both sides and accept (use the same pattern as the working Issue 8 test)
    await dialog.locator('#side1').click();
    await page.getByRole('option', { name: 'Entidad', exact: true }).click();

    await dialog.locator('#side2').click();
    await page.getByRole('option', { name: 'Entidad 1', exact: true }).click();

    const acceptBtn = dialog.getByRole('button', { name: 'Aceptar' });
    await expect(acceptBtn).toBeEnabled();
    await acceptBtn.click();
    await expect(dialog).toBeHidden();

    // Sanity check before reload: two cardinality labels exist
    await expect(page.getByText('X:X', { exact: true })).toHaveCount(2);

    // 4) Reload immediately (no moving elements)
    await page.reload();

    // 5) After reload, configuration must still exist
    await expect(page.getByText('X:X', { exact: true })).toHaveCount(2);
});

test('reload preserves explicit attribute edge ids', async ({ page }) => {
    const diagram = {
        entities: [
            {
                idMx: '10',
                name: 'Cliente',
                position: { x: 100, y: 100 },
                weak: false,
                ownerEntityId: null,
                identifyingRelationId: null,
                attributes: [
                    {
                        idMx: '20',
                        name: 'id_cliente',
                        position: { x: 220, y: 70 },
                        key: true,
                        partialKey: false,
                        cell: ['20', 'edge_attr_id'],
                        offsetX: 120,
                        offsetY: -30,
                    },
                    {
                        idMx: '30',
                        name: 'nombre',
                        position: { x: 220, y: 130 },
                        key: false,
                        partialKey: false,
                        cell: ['30', 'edge_attr_nombre'],
                        offsetX: 120,
                        offsetY: 30,
                    },
                ],
            },
        ],
        relations: [],
    };

    // Seed a persisted diagram whose attribute-edge ids are explicit and non-arithmetic.
    // The editor must preserve them after recreate + sync.
    await page.addInitScript((initialDiagram) => {
        window.localStorage.setItem('diagramData', JSON.stringify(initialDiagram));
    }, diagram);

    await page.goto('/');

    await expect(page.locator('.mxgraph-drawing-container')).toBeVisible();

    const persisted = await page.evaluate(() =>
        JSON.parse(window.localStorage.getItem('diagramData') || '{}'),
    );

    expect(
        persisted.entities[0].attributes.map((attr) => attr.cell[1]),
    ).toEqual(['edge_attr_id', 'edge_attr_nombre']);
});