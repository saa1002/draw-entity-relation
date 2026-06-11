import { test, expect } from '@playwright/test';

import {
    addEntity,
    addRelation,
    configureRelationSides,
    configureTernaryRelationCardinalities,
    configureTernaryRelationSides,
    enableMxGraphDebug,
    expectAttributeCellVisible,
    expectSavedDiagramState,
    getSavedDiagram,
} from '../helpers/canvas';

import {
    exportCurrentDiagram,
    exportCurrentDiagramImage,
    importDiagram,
    resetDiagram,
    seedSavedDiagram,
} from '../helpers/persistence';

test.beforeEach(async ({ page }) => {
    await enableMxGraphDebug(page);
});

const createImportEntity = ({
    idMx,
    name,
    x,
    y,
    attributeId = `${idMx}-id`,
    attributeName = 'id',
}) => ({
    idMx,
    name,
    position: { x, y },
    weak: false,
    ownerEntityId: null,
    identifyingRelationId: null,
    attributes: [
        {
            idMx: attributeId,
            name: attributeName,
            position: { x: x + 120, y },
            key: true,
            partialKey: false,
            cell: [attributeId, `${attributeId}-edge`],
            offsetX: 120,
            offsetY: 0,
        },
    ],
});

const createBinaryImportRelation = ({
    idMx,
    name,
    x,
    y,
    side1EntityId,
    side2EntityId,
}) => ({
    idMx,
    name,
    position: { x, y },
    arity: 2,
    canHoldAttributes: false,
    isIdentifying: false,
    attributes: [],
    side1: {
        idMx: `${idMx}-side-1`,
        cardinality: '1:N',
        role: '',
        cell: `${idMx}-side-1-cardinality`,
        edgeId: `${idMx}-side-1-edge`,
        entity: { idMx: side1EntityId },
    },
    side2: {
        idMx: `${idMx}-side-2`,
        cardinality: '1:1',
        role: '',
        cell: `${idMx}-side-2-cardinality`,
        edgeId: `${idMx}-side-2-edge`,
        entity: { idMx: side2EntityId },
    },
});

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

test('ternary relationship configuration persists after reload', async ({ page }) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 180, y: 180 });
    await addEntity(page, 'Entidad 1', { x: 420, y: 180 });
    await addEntity(page, 'Entidad 2', { x: 300, y: 420 });
    await addRelation(page, 'Relación', { x: 300, y: 300 });

    await configureTernaryRelationSides(
        page,
        'Relación',
        'Entidad',
        'Entidad 1',
        'Entidad 2',
    );

    await configureTernaryRelationCardinalities(
        page,
        'Relación',
        '0:N',
        '0:1',
        '0:N',
    );

    await expect(page.getByText('N', { exact: true })).toHaveCount(2);
    await expect(page.getByText('1', { exact: true })).toHaveCount(1);

    await page.reload();

    await expect(page.getByText('Relación', { exact: true })).toBeVisible();
    await expect(page.getByText('N', { exact: true })).toHaveCount(2);
    await expect(page.getByText('1', { exact: true })).toHaveCount(1);

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const relation = diagram.relations.find(
                (relationItem) => relationItem.name === 'Relación',
            );

            return {
                arity: relation?.arity,
                side1Cardinality: relation?.side1?.cardinality,
                side2Cardinality: relation?.side2?.cardinality,
                side3Cardinality: relation?.side3?.cardinality,
                side1HasEdge: Boolean(relation?.side1?.edgeId),
                side2HasEdge: Boolean(relation?.side2?.edgeId),
                side3HasEdge: Boolean(relation?.side3?.edgeId),
                side1HasCardinalityCell: Boolean(relation?.side1?.cell),
                side2HasCardinalityCell: Boolean(relation?.side2?.cell),
                side3HasCardinalityCell: Boolean(relation?.side3?.cell),
            };
        },
        {
            arity: 3,
            side1Cardinality: '0:N',
            side2Cardinality: '0:1',
            side3Cardinality: '0:N',
            side1HasEdge: true,
            side2HasEdge: true,
            side3HasEdge: true,
            side1HasCardinalityCell: true,
            side2HasCardinalityCell: true,
            side3HasCardinalityCell: true,
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

test('export/import round-trip preserves ternary relationship structure', async ({ page }) => {
    const diagram = {
        entities: [
            {
                idMx: '10',
                name: 'Proveedor',
                position: { x: 100, y: 100 },
                weak: false,
                ownerEntityId: null,
                identifyingRelationId: null,
                attributes: [
                    {
                        idMx: '11',
                        name: 'id_proveedor',
                        position: { x: 220, y: 70 },
                        key: true,
                        partialKey: false,
                        cell: ['11', 'edge_attr_proveedor_id'],
                        offsetX: 120,
                        offsetY: -30,
                    },
                ],
            },
            {
                idMx: '20',
                name: 'Producto',
                position: { x: 500, y: 100 },
                weak: false,
                ownerEntityId: null,
                identifyingRelationId: null,
                attributes: [
                    {
                        idMx: '21',
                        name: 'id_producto',
                        position: { x: 620, y: 70 },
                        key: true,
                        partialKey: false,
                        cell: ['21', 'edge_attr_producto_id'],
                        offsetX: 120,
                        offsetY: -30,
                    },
                ],
            },
            {
                idMx: '30',
                name: 'Proyecto',
                position: { x: 300, y: 420 },
                weak: false,
                ownerEntityId: null,
                identifyingRelationId: null,
                attributes: [
                    {
                        idMx: '31',
                        name: 'id_proyecto',
                        position: { x: 420, y: 390 },
                        key: true,
                        partialKey: false,
                        cell: ['31', 'edge_attr_proyecto_id'],
                        offsetX: 120,
                        offsetY: -30,
                    },
                ],
            },
        ],
        relations: [
            {
                idMx: '40',
                name: 'Suministra',
                position: { x: 300, y: 260 },
                arity: 3,
                canHoldAttributes: false,
                isIdentifying: false,
                attributes: [],
                side1: {
                    idMx: 'card_proveedor_suministra',
                    cardinality: '0:N',
                    cell: 'card_proveedor_suministra',
                    edgeId: 'edge_rel_proveedor',
                    entity: { idMx: '10' },
                },
                side2: {
                    idMx: 'card_producto_suministra',
                    cardinality: '0:1',
                    cell: 'card_producto_suministra',
                    edgeId: 'edge_rel_producto',
                    entity: { idMx: '20' },
                },
                side3: {
                    idMx: 'card_proyecto_suministra',
                    cardinality: '0:1',
                    cell: 'card_proyecto_suministra',
                    edgeId: 'edge_rel_proyecto',
                    entity: { idMx: '30' },
                },
            },
        ],
    };

    await seedSavedDiagram(page, diagram);

    await page.goto('/');

    await expect(page.locator('.mxgraph-drawing-container')).toBeVisible();

    await expect(page.getByText('Proveedor', { exact: true })).toBeVisible();
    await expect(page.getByText('Producto', { exact: true })).toBeVisible();
    await expect(page.getByText('Proyecto', { exact: true })).toBeVisible();
    await expect(page.getByText('Suministra', { exact: true })).toBeVisible();
    await expect(page.getByText('N', { exact: true })).toHaveCount(1);
    await expect(page.getByText('1', { exact: true })).toHaveCount(2);

    const exportedBefore = await exportCurrentDiagram(page);

    await resetDiagram(page);

    await expect(page.getByText('Proveedor', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Producto', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Proyecto', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Suministra', { exact: true })).toHaveCount(0);

    await importDiagram(page, exportedBefore);

    await expect(page.getByText('Proveedor', { exact: true })).toBeVisible();
    await expect(page.getByText('Producto', { exact: true })).toBeVisible();
    await expect(page.getByText('Proyecto', { exact: true })).toBeVisible();
    await expect(page.getByText('Suministra', { exact: true })).toBeVisible();
    await expect(page.getByText('N', { exact: true })).toHaveCount(1);
    await expect(page.getByText('1', { exact: true })).toHaveCount(2);

    const exportedAfter = await exportCurrentDiagram(page);

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
    await expect(page.getByText('codigo', { exact: true })).toHaveCount(0);
    await expectAttributeCellVisible(page, 'Documento', 'codigo', true);
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
    await expect(page.getByText('codigo', { exact: true })).toHaveCount(0);
    await expectAttributeCellVisible(page, 'Documento', 'codigo', true);
    await expect(page.getByText('serie', { exact: true })).toBeVisible();
    await expect(page.getByText('numero', { exact: true })).toBeVisible();
    await expect(page.getByText('descripcion', { exact: true })).toBeVisible();

    const exportedAfter = await exportCurrentDiagram(page);

    expect(exportedAfter).toEqual(exportedBefore);
});

test('JSON import replace mode replaces the current diagram', async ({ page }) => {
    const currentDiagram = {
        entities: [
            createImportEntity({
                idMx: 'current-entity',
                name: 'Actual',
                x: 100,
                y: 100,
            }),
        ],
        relations: [],
        isas: [],
    };

    const importedDiagram = {
        entities: [
            createImportEntity({
                idMx: 'imported-entity',
                name: 'Importada',
                x: 300,
                y: 100,
            }),
        ],
        relations: [],
        isas: [],
    };

    await seedSavedDiagram(page, currentDiagram);

    await page.goto('/');

    await expect(page.getByText('Actual', { exact: true })).toBeVisible();

    await importDiagram(page, importedDiagram);

    await expect(page.getByText('Actual', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Importada', { exact: true })).toBeVisible();

    await expectSavedDiagramState(
        page,
        (diagram) => ({
            entityNames: diagram.entities.map((entity) => entity.name),
            relationCount: diagram.relations.length,
            isaCount: diagram.isas.length,
        }),
        {
            entityNames: ['Importada'],
            relationCount: 0,
            isaCount: 0,
        },
    );
});

test('JSON import merge mode keeps current diagram and renames conflicts', async ({ page }) => {
    const currentDiagram = {
        entities: [
            createImportEntity({
                idMx: 'current-client',
                name: 'Cliente',
                x: 100,
                y: 100,
            }),
            createImportEntity({
                idMx: 'current-order',
                name: 'Pedido',
                x: 500,
                y: 100,
            }),
        ],
        relations: [
            createBinaryImportRelation({
                idMx: 'current-relation',
                name: 'Realiza',
                x: 300,
                y: 100,
                side1EntityId: 'current-client',
                side2EntityId: 'current-order',
            }),
        ],
        isas: [],
    };

    const importedDiagram = {
        entities: [
            createImportEntity({
                idMx: 'imported-client',
                name: 'Cliente',
                x: 100,
                y: 300,
            }),
            createImportEntity({
                idMx: 'imported-order',
                name: 'Pedido',
                x: 500,
                y: 300,
            }),
        ],
        relations: [
            createBinaryImportRelation({
                idMx: 'imported-relation',
                name: 'Realiza',
                x: 300,
                y: 300,
                side1EntityId: 'imported-client',
                side2EntityId: 'imported-order',
            }),
        ],
        isas: [],
    };

    await seedSavedDiagram(page, currentDiagram);

    await page.goto('/');

    await importDiagram(page, importedDiagram, { mode: 'merge' });

    await expect(page.getByText('Cliente', { exact: true })).toBeVisible();
    await expect(page.getByText('Pedido', { exact: true })).toBeVisible();
    await expect(page.getByText('Realiza', { exact: true })).toBeVisible();

    await expect(page.getByText('Cliente (1)', { exact: true })).toBeVisible();
    await expect(page.getByText('Pedido (1)', { exact: true })).toBeVisible();
    await expect(page.getByText('Realiza (1)', { exact: true })).toBeVisible();

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const importedClient = diagram.entities.find(
                (entity) => entity.name === 'Cliente (1)',
            );
            const importedOrder = diagram.entities.find(
                (entity) => entity.name === 'Pedido (1)',
            );
            const importedRelation = diagram.relations.find(
                (relation) => relation.name === 'Realiza (1)',
            );

            return {
                entityNames: diagram.entities.map((entity) => entity.name),
                relationNames: diagram.relations.map(
                    (relation) => relation.name,
                ),
                importedIdsWereRemapped:
                    importedClient?.idMx !== 'imported-client' &&
                    importedOrder?.idMx !== 'imported-order' &&
                    importedRelation?.idMx !== 'imported-relation',
                importedRelationTargetsWereRemapped:
                    importedRelation?.side1?.entity?.idMx ===
                        importedClient?.idMx &&
                    importedRelation?.side2?.entity?.idMx ===
                        importedOrder?.idMx,
                importedDiagramWasShifted:
                    importedClient?.position?.x >
                    diagram.entities.find((entity) => entity.name === 'Cliente')
                        ?.position?.x,
            };
        },
        {
            entityNames: ['Cliente', 'Pedido', 'Cliente (1)', 'Pedido (1)'],
            relationNames: ['Realiza', 'Realiza (1)'],
            importedIdsWereRemapped: true,
            importedRelationTargetsWereRemapped: true,
            importedDiagramWasShifted: true,
        },
    );

    const exportedAfterMerge = await exportCurrentDiagram(page);

    expect(exportedAfterMerge.entities.map((entity) => entity.name)).toEqual([
        'Cliente',
        'Pedido',
        'Cliente (1)',
        'Pedido (1)',
    ]);

    expect(exportedAfterMerge.relations.map((relation) => relation.name)).toEqual([
        'Realiza',
        'Realiza (1)',
    ]);
});

test('export current diagram as SVG image', async ({ page }) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 260, y: 180 });

    const exportedFile = await exportCurrentDiagramImage(page, 'SVG');

    expect(exportedFile.fileName).toMatch(
        /^diagrama-er-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.svg$/,
    );
    expect(exportedFile.mimeType).toBe('image/svg+xml;charset=utf-8');
    expect(exportedFile.content).toContain('<svg');
    expect(exportedFile.content).toContain('viewBox');
    expect(exportedFile.content).toContain('Entidad');
});

test('export current diagram as PNG image', async ({ page }) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 260, y: 180 });

    const exportedFile = await exportCurrentDiagramImage(page, 'PNG');

    expect(exportedFile.fileName).toMatch(
        /^diagrama-er-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.png$/,
    );
    expect(exportedFile.mimeType).toBe('image/png');
    expect(exportedFile.size).toBeGreaterThan(0);
});