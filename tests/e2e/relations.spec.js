import { test, expect } from '@playwright/test';

import {
    addAttributeToSelectedElement,
    addEntity,
    addRelation,
    configureRelationCardinalities,
    configureRelationSides,
    configureTernaryRelationCardinalities,
    configureTernaryRelationSides,
    expectSavedDiagramState,
    expectSavedRelationAttributeToMatch,
    expectSavedRelationToMatch,
    openRelationCardinalitiesDialog,
    openRelationConfigDialog,
    selectEntity,
    selectRelation,
    selectRelationArity,
    selectRelationCardinality,
    selectRelationSide,
} from '../helpers/canvas';

test('reconfigure relationship: Accept disabled/enabled in both configurations', async ({ page }) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 180, y: 180 });
    await addEntity(page, 'Entidad 1', { x: 420, y: 180 });
    await addRelation(page, 'Relación', { x: 300, y: 320 });

    const configureSidesCheckingAcceptButton = async (side1Name, side2Name) => {
        const dialog = await openRelationConfigDialog(page, 'Relación');
        const acceptBtn = dialog.getByRole('button', { name: 'Aceptar' });

        await expect(acceptBtn).toBeDisabled();

        await selectRelationSide(page, dialog, 'side1', side1Name);

        await expect(acceptBtn).toBeDisabled();

        await selectRelationSide(page, dialog, 'side2', side2Name);

        await expect(acceptBtn).toBeEnabled();

        await acceptBtn.click();
        await expect(dialog).toBeHidden();
    };

    await configureSidesCheckingAcceptButton('Entidad', 'Entidad 1');

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

    await configureSidesCheckingAcceptButton('Entidad 1', 'Entidad');

    await expect(page.getByText('X:X', { exact: true })).toHaveCount(2);

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const relation = diagram.relations.find(
                (relationItem) => relationItem.name === 'Relación',
            );
            const entity = diagram.entities.find(
                (entityItem) => entityItem.name === 'Entidad',
            );
            const entity1 = diagram.entities.find(
                (entityItem) => entityItem.name === 'Entidad 1',
            );

            return {
                side1IsEntity1:
                    relation?.side1?.entity?.idMx === entity1?.idMx,
                side2IsEntity:
                    relation?.side2?.entity?.idMx === entity?.idMx,
            };
        },
        {
            side1IsEntity1: true,
            side2IsEntity: true,
        },
    );
});

test('configure ternary relationship participants', async ({ page }) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 180, y: 180 });
    await addEntity(page, 'Entidad 1', { x: 420, y: 180 });
    await addEntity(page, 'Entidad 2', { x: 300, y: 420 });
    await addRelation(page, 'Relación', { x: 300, y: 300 });

    const dialog = await openRelationConfigDialog(page, 'Relación');
    const acceptBtn = dialog.getByRole('button', { name: 'Aceptar' });

    await expect(acceptBtn).toBeDisabled();

    await selectRelationArity(page, dialog, 'Ternaria');

    await expect(acceptBtn).toBeDisabled();

    await selectRelationSide(page, dialog, 'side1', 'Entidad');

    await expect(acceptBtn).toBeDisabled();

    await selectRelationSide(page, dialog, 'side2', 'Entidad 1');

    await expect(acceptBtn).toBeDisabled();

    await selectRelationSide(page, dialog, 'side3', 'Entidad 2');

    await expect(acceptBtn).toBeEnabled();

    await acceptBtn.click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText('X:X', { exact: true })).toHaveCount(3);

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const relation = diagram.relations.find(
                (relationItem) => relationItem.name === 'Relación',
            );
            const entity = diagram.entities.find(
                (entityItem) => entityItem.name === 'Entidad',
            );
            const entity1 = diagram.entities.find(
                (entityItem) => entityItem.name === 'Entidad 1',
            );
            const entity2 = diagram.entities.find(
                (entityItem) => entityItem.name === 'Entidad 2',
            );

            return {
                arity: relation?.arity,
                side1IsEntity:
                    relation?.side1?.entity?.idMx === entity?.idMx,
                side2IsEntity1:
                    relation?.side2?.entity?.idMx === entity1?.idMx,
                side3IsEntity2:
                    relation?.side3?.entity?.idMx === entity2?.idMx,
                side1HasCardinalityCell: Boolean(relation?.side1?.cell),
                side2HasCardinalityCell: Boolean(relation?.side2?.cell),
                side3HasCardinalityCell: Boolean(relation?.side3?.cell),
            };
        },
        {
            arity: 3,
            side1IsEntity: true,
            side2IsEntity1: true,
            side3IsEntity2: true,
            side1HasCardinalityCell: true,
            side2HasCardinalityCell: true,
            side3HasCardinalityCell: true,
        },
    );
});

test('configure cardinalities for a ternary relationship', async ({ page }) => {
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

    const dialog = await openRelationCardinalitiesDialog(page, 'Relación');

    await dialog.locator('#side1-to-side2').click();

    await expect(
        page.getByRole('option', { name: '1', exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole('option', { name: 'N', exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole('option', { name: '0:1', exact: true }),
    ).toHaveCount(0);
    await expect(
        page.getByRole('option', { name: '0:N', exact: true }),
    ).toHaveCount(0);
    await expect(
        page.getByRole('option', { name: '1:1', exact: true }),
    ).toHaveCount(0);
    await expect(
        page.getByRole('option', { name: '1:N', exact: true }),
    ).toHaveCount(0);

    await page.getByRole('option', { name: 'N', exact: true }).click();

    await selectRelationCardinality(
        page,
        dialog,
        'side2-to-side1',
        '1',
    );
    await selectRelationCardinality(
        page,
        dialog,
        'side3-cardinality',
        'N',
    );

    const acceptBtn = dialog.getByRole('button', { name: 'Aceptar' });
    await expect(acceptBtn).toBeEnabled();

    await acceptBtn.click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText('N', { exact: true })).toHaveCount(2);
    await expect(page.getByText('1', { exact: true })).toHaveCount(1);

    await expectSavedRelationToMatch(page, 'Relación', {
        arity: 3,
        canHoldAttributes: true,
        side1: {
            cardinality: "0:N",
        },
        side2: {
            cardinality: "0:1",
        },
        side3: {
            cardinality: "0:N",
        },
    });
});

test('configure cardinalities for a configured relationship', async ({ page }) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 180, y: 180 });
    await addEntity(page, 'Entidad 1', { x: 420, y: 180 });
    await addRelation(page, 'Relación', { x: 300, y: 320 });

    await configureRelationSides(page, 'Relación', 'Entidad', 'Entidad 1');
    await configureRelationCardinalities(page, 'Relación', '1:N', '0:1');

    await expect(page.getByText('1:N', { exact: true })).toBeVisible();
    await expect(page.getByText('0:1', { exact: true })).toBeVisible();

    await expectSavedRelationToMatch(page, 'Relación', {
        side1: {
            cardinality: '1:N',
        },
        side2: {
            cardinality: '0:1',
        },
        canHoldAttributes: false,
    });
});

test('allow attributes on many-to-many relationships', async ({ page }) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 180, y: 180 });
    await addEntity(page, 'Entidad 1', { x: 420, y: 180 });
    await addRelation(page, 'Relación', { x: 300, y: 320 });

    await configureRelationSides(page, 'Relación', 'Entidad', 'Entidad 1');
    await configureRelationCardinalities(page, 'Relación', '0:N', '1:N');

    await expectSavedRelationToMatch(page, 'Relación', {
        side1: {
            cardinality: '0:N',
        },
        side2: {
            cardinality: '1:N',
        },
        canHoldAttributes: true,
    });

    await selectRelation(page, 'Relación');

    await expect(
        page.getByRole('button', { name: 'Añadir atributo' }),
    ).toBeVisible();

    await addAttributeToSelectedElement(page);

    await expectSavedRelationAttributeToMatch(page, 'Relación', 0, {
        name: 'Atributo',
    });
});

test('reconfigure a ternary relationship back to binary', async ({ page }) => {
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

    await expect(page.getByText('X:X', { exact: true })).toHaveCount(3);

    const dialog = await openRelationConfigDialog(page, 'Relación');
    const acceptBtn = dialog.getByRole('button', { name: 'Aceptar' });

    await selectRelationArity(page, dialog, 'Binaria');
    await selectRelationSide(page, dialog, 'side1', 'Entidad 2');
    await selectRelationSide(page, dialog, 'side2', 'Entidad');

    await expect(acceptBtn).toBeEnabled();

    await acceptBtn.click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText('X:X', { exact: true })).toHaveCount(2);

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const relation = diagram.relations.find(
                (relationItem) => relationItem.name === 'Relación',
            );
            const entity = diagram.entities.find(
                (entityItem) => entityItem.name === 'Entidad',
            );
            const entity2 = diagram.entities.find(
                (entityItem) => entityItem.name === 'Entidad 2',
            );

            return {
                arity: relation?.arity ?? null,
                side3IsMissing: !Object.prototype.hasOwnProperty.call(
                    relation ?? {},
                    'side3',
                ),
                side1IsEntity2:
                    relation?.side1?.entity?.idMx === entity2?.idMx,
                side2IsEntity:
                    relation?.side2?.entity?.idMx === entity?.idMx,
                side1Cardinality: relation?.side1?.cardinality,
                side2Cardinality: relation?.side2?.cardinality,
                canHoldAttributes: relation?.canHoldAttributes,
            };
        },
        {
            arity: null,
            side3IsMissing: true,
            side1IsEntity2: true,
            side2IsEntity: true,
            side1Cardinality: 'X:X',
            side2Cardinality: 'X:X',
            canHoldAttributes: false,
        },
    );
});

test('do not offer identifying relationship action for ternary relationships', async ({ page }) => {
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

    await selectRelation(page, 'Relación');

    await expect(
        page.getByRole('button', {
            name: 'Marcar como dependencia por identificación',
        }),
    ).toHaveCount(0);
});

test('block export when a ternary relationship repeats participating entities without distinct roles', async ({
    page,
}) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 180, y: 180 });
    await addEntity(page, 'Entidad 1', { x: 420, y: 180 });
    await addRelation(page, 'Relación', { x: 300, y: 300 });

    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedElement(page);

    await selectEntity(page, 'Entidad 1');
    await addAttributeToSelectedElement(page);

    await configureTernaryRelationSides(
        page,
        'Relación',
        'Entidad',
        'Entidad',
        'Entidad 1',
    );

    await configureTernaryRelationCardinalities(
        page,
        'Relación',
        '0:N',
        '0:N',
        '0:N',
    );

    await page.getByRole('button', { name: 'Exportar JSON' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
        dialog.getByText('Exportación diagrama en JSON'),
    ).toBeVisible();

    await expect(
        dialog.getByText(
            'Hay relaciones ternarias con entidades participantes repetidas sin roles distintos.',
        ),
    ).toBeVisible();

    await expect(dialog.getByRole('button', { name: 'Aceptar' })).toBeDisabled();
});