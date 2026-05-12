import { test, expect } from '@playwright/test';

import {
    addEntity,
    addRelation,
    configureRelationSides,
    expectSavedDiagramState,
    getSavedDiagram,
} from '../helpers/canvas';

import {
    exportCurrentDiagram,
    importDiagram,
    resetDiagram,
    seedSavedDiagram,
} from '../helpers/persistence';

test('relation configuration persists after accept and survives reload', async ({ page }) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 180, y: 180 });
    await addEntity(page, 'Entidad 1', { x: 420, y: 180 });
    await addRelation(page, 'Relación', { x: 300, y: 320 });

    await configureRelationSides(page, 'Relación', 'Entidad', 'Entidad 1');

    await expect(page.getByText('X:X', { exact: true })).toHaveCount(2);

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const relation = diagram.relations.find(
                (relationItem) => relationItem.name === 'Relación',
            );

            return {
                side1Configured: Boolean(relation?.side1?.entity?.idMx),
                side2Configured: Boolean(relation?.side2?.entity?.idMx),
            };
        },
        {
            side1Configured: true,
            side2Configured: true,
        },
    );

    await page.reload();

    await expect(page.getByText('X:X', { exact: true })).toHaveCount(2);

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const relation = diagram.relations.find(
                (relationItem) => relationItem.name === 'Relación',
            );

            return {
                side1Configured: Boolean(relation?.side1?.entity?.idMx),
                side2Configured: Boolean(relation?.side2?.entity?.idMx),
            };
        },
        {
            side1Configured: true,
            side2Configured: true,
        },
    );
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

    await seedSavedDiagram(page, diagram);

    await page.goto('/');

    await expect(page.locator('.mxgraph-drawing-container')).toBeVisible();

    const persisted = await getSavedDiagram(page);

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

    await seedSavedDiagram(page, diagram);

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

test('export/import round-trip preserves nested attribute trees', async ({ page }) => {
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
                    {
                        idMx: '23',
                        name: 'descripcion',
                        position: { x: 220, y: 180 },
                        key: false,
                        partialKey: false,
                        multivalued: true,
                        cell: ['23', 'edge_attr_descripcion'],
                        offsetX: 120,
                        offsetY: 80,
                    },
                ],
            },
        ],
        relations: [],
    };

    await seedSavedDiagram(page, diagram);

    await page.goto('/');

    await expect(page.locator('.mxgraph-drawing-container')).toBeVisible();

    await expect(page.getByText('Documento', { exact: true })).toBeVisible();
    await expect(page.getByText('codigo', { exact: true })).toBeVisible();
    await expect(page.getByText('serie', { exact: true })).toBeVisible();
    await expect(page.getByText('numero', { exact: true })).toBeVisible();
    await expect(page.getByText('descripcion', { exact: true })).toBeVisible();

    const exportedBefore = await exportCurrentDiagram(page);

    expect(exportedBefore.entities[0].attributes[0].children.map(
        (attribute) => attribute.name,
    )).toEqual(['serie', 'numero']);

    expect(exportedBefore.entities[0].attributes[0].children.map(
        (attribute) => attribute.cell[1],
    )).toEqual(['edge_attr_serie', 'edge_attr_numero']);

    expect(exportedBefore.entities[0].attributes[1]).toMatchObject({
        name: 'descripcion',
        multivalued: true,
    });

    await resetDiagram(page);

    await expect(page.getByText('Documento', { exact: true })).toHaveCount(0);
    await expect(page.getByText('codigo', { exact: true })).toHaveCount(0);
    await expect(page.getByText('serie', { exact: true })).toHaveCount(0);
    await expect(page.getByText('numero', { exact: true })).toHaveCount(0);

    await importDiagram(page, exportedBefore);

    await expect(page.getByText('Documento', { exact: true })).toBeVisible();
    await expect(page.getByText('codigo', { exact: true })).toBeVisible();
    await expect(page.getByText('serie', { exact: true })).toBeVisible();
    await expect(page.getByText('numero', { exact: true })).toBeVisible();
    await expect(page.getByText('descripcion', { exact: true })).toBeVisible();

    const exportedAfter = await exportCurrentDiagram(page);

    expect(exportedAfter).toEqual(exportedBefore);
});