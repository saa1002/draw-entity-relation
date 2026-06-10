import { test, expect } from '@playwright/test';
import {
    addAttributeToSelectedEntity,
    addEntity,
    addRelation,
    configureRelationSides,
    expectSavedDiagramState,
    expectSavedEntityAttributeToMatch,
    expectSavedEntityToMatch,
    getSavedEntity,
    markEntityAsWeak,
    markSelectedRelationAsIdentifying,
    unmarkSelectedWeakEntity,
} from '../helpers/canvas';

test('mark and unmark an entity as weak', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await markEntityAsWeak(page);
    
    await expectSavedEntityToMatch(page, 'Entidad', {
        weak: true,
    });

    await unmarkSelectedWeakEntity(page);

    await expectSavedEntityToMatch(page, 'Entidad', {
        weak: false,
    });

    const entity = await getSavedEntity(page);

    expect(entity.ownerEntityId).toBeNull();
    expect(entity.identifyingRelationId).toBeNull();
});

test('default primary key is converted to discriminant when marking an entity as weak', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await markEntityAsWeak(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'id',
        key: false,
        partialKey: true,
    });

    await page.getByText('id', { exact: true }).click();

    await expect(
        page.getByRole('button', { name: 'Quitar discriminante' }),
    ).toBeVisible();
});

test('mark a configured relation as identifying between a strong and a weak entity', async ({
    page,
}) => {
    await page.goto('/');

    await addEntity(page, 'Entidad', { x: 180, y: 180 });
    await addEntity(page, 'Entidad 1', { x: 420, y: 180 });
    await addRelation(page, 'Relación', { x: 300, y: 320 });

    await markEntityAsWeak(page, 'Entidad 1');
    await configureRelationSides(page, 'Relación', 'Entidad', 'Entidad 1');
    await markSelectedRelationAsIdentifying(page);

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const strongEntity = diagram.entities.find(
                (entity) => entity.name === 'Entidad',
            );
            const weakEntity = diagram.entities.find(
                (entity) => entity.name === 'Entidad 1',
            );
            const relation = diagram.relations.find(
                (relationItem) => relationItem.name === 'Relación',
            );

            return {
                relationIsIdentifying: relation?.isIdentifying,
                weakOwnerIsStrong:
                    weakEntity?.ownerEntityId === strongEntity?.idMx,
                weakIdentifyingRelation:
                    weakEntity?.identifyingRelationId === relation?.idMx,
                strongSideCardinality: relation?.side1?.cardinality,
                weakSideCardinality: relation?.side2?.cardinality,
                canHoldAttributes: relation?.canHoldAttributes,
            };
        },
        {
            relationIsIdentifying: true,
            weakOwnerIsStrong: true,
            weakIdentifyingRelation: true,
            strongSideCardinality: '1:1',
            weakSideCardinality: '0:N',
            canHoldAttributes: false,
        },
    );
});