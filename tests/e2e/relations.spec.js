import { test, expect } from '@playwright/test';

import {
    addAttributeToSelectedElement,
    addEntity,
    addRelation,
    configureRelationCardinalities,
    configureRelationSides,
    configureTernaryRelationSides,
    expectSavedDiagramState,
    expectSavedRelationAttributeToMatch,
    expectSavedRelationToMatch,
    openRelationConfigDialog,
    selectRelation,
    selectRelationArity,
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