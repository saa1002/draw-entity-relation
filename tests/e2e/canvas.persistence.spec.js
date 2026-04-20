import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function exportCurrentDiagram(page) {
    const downloadPromise = page.waitForEvent('download');

    await page.getByRole('button', { name: 'Exportar JSON' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Exportación diagrama en JSON')).toBeVisible();

    await dialog.getByRole('button', { name: 'Aceptar' }).click();

    const download = await downloadPromise;
    const savePath = path.join(
        os.tmpdir(),
        `diagram-${Date.now()}-${download.suggestedFilename()}`,
    );

    await download.saveAs(savePath);

    const raw = await fs.readFile(savePath, 'utf8');
    return JSON.parse(raw);
}

async function resetDiagram(page) {
    await page.getByRole('button', { name: 'Reiniciar' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Reiniciar diagrama')).toBeVisible();

    await dialog.getByRole('button', { name: 'Aceptar' }).click();
}

async function importDiagram(page, diagram) {
    await page.getByRole('button', { name: 'Importar JSON' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Importación de diagrama desde JSON')).toBeVisible();

    const input = dialog.locator('input[type="file"]');

    await input.setInputFiles({
        name: 'diagram.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(diagram), 'utf8'),
    });

    // Si este toast da problemas por timing, puede eliminarse
    await expect(page.getByText('Diagrama importado con éxito.')).toBeVisible();
}

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

test('export/import round-trip preserves diagram structure', async ({ page }) => {
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
                        cell: ['20', 'edge_attr_cliente_id'],
                        offsetX: 120,
                        offsetY: -30,
                    },
                    {
                        idMx: '21',
                        name: 'nombre',
                        position: { x: 220, y: 130 },
                        key: false,
                        partialKey: false,
                        cell: ['21', 'edge_attr_cliente_nombre'],
                        offsetX: 120,
                        offsetY: 30,
                    },
                ],
            },
            {
                idMx: '30',
                name: 'Pedido',
                position: { x: 500, y: 100 },
                weak: false,
                ownerEntityId: null,
                identifyingRelationId: null,
                attributes: [
                    {
                        idMx: '40',
                        name: 'id_pedido',
                        position: { x: 620, y: 70 },
                        key: true,
                        partialKey: false,
                        cell: ['40', 'edge_attr_pedido_id'],
                        offsetX: 120,
                        offsetY: -30,
                    },
                ],
            },
        ],
        relations: [
            {
                idMx: '50',
                name: 'Realiza',
                position: { x: 300, y: 100 },
                canHoldAttributes: false,
                isIdentifying: false,
                attributes: [],
                side1: {
                    idMx: 'card_cliente_pedido',
                    cardinality: '1:N',
                    cell: 'card_cliente_pedido',
                    edgeId: 'edge_rel_cliente',
                    entity: { idMx: '10' },
                },
                side2: {
                    idMx: 'card_pedido_cliente',
                    cardinality: '1:1',
                    cell: 'card_pedido_cliente',
                    edgeId: 'edge_rel_pedido',
                    entity: { idMx: '30' },
                },
            },
        ],
    };

    await page.addInitScript((initialDiagram) => {
        window.localStorage.setItem('diagramData', JSON.stringify(initialDiagram));
    }, diagram);

    await page.goto('/');

    await expect(page.locator('.mxgraph-drawing-container')).toBeVisible();

    // Sanity check: the seeded diagram is rendered
    await expect(page.getByText('Cliente', { exact: true })).toBeVisible();
    await expect(page.getByText('Pedido', { exact: true })).toBeVisible();
    await expect(page.getByText('Realiza', { exact: true })).toBeVisible();
    await expect(page.getByText('1:N', { exact: true })).toHaveCount(1);
    await expect(page.getByText('1:1', { exact: true })).toHaveCount(1);

    // First export
    const exportedBefore = await exportCurrentDiagram(page);

    // Reset the canvas to ensure the following import really reconstructs the diagram
    await resetDiagram(page);

    await expect(page.getByText('Cliente', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Pedido', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Realiza', { exact: true })).toHaveCount(0);

    // Import the exported diagram
    await importDiagram(page, exportedBefore);

    // The imported diagram should be visible again
    await expect(page.getByText('Cliente', { exact: true })).toBeVisible();
    await expect(page.getByText('Pedido', { exact: true })).toBeVisible();
    await expect(page.getByText('Realiza', { exact: true })).toBeVisible();
    await expect(page.getByText('1:N', { exact: true })).toHaveCount(1);
    await expect(page.getByText('1:1', { exact: true })).toHaveCount(1);

    // Second export after the round-trip
    const exportedAfter = await exportCurrentDiagram(page);

    // The export/import/export cycle should preserve the persisted structure
    expect(exportedAfter).toEqual(exportedBefore);
});