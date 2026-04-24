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
    selectEntity,
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

test('first attribute added to a weak entity is persisted as discriminant', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await markEntityAsWeak(page);
    await addAttributeToSelectedEntity(page, 'Atributo1');

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: false,
        partialKey: true,
    });

    await page.getByText('Atributo', { exact: true }).click();

    await expect(
        page.getByRole('button', { name: 'Quitar discriminante' }),
    ).toBeVisible();
});