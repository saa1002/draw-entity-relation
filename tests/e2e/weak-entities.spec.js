import { test, expect } from '@playwright/test';
import {
    addEntity,
    addRelation,
    configureRelationSides,
    getPersistedDiagram,
    getPersistedEntity,
    markEntityAsWeak,
    markSelectedRelationAsIdentifying,
    selectEntity,
} from '../helpers/canvas';

test('mark and unmark an entity as weak', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('svg');
    const entityIcon = page.locator('img[src="images/rectangle.png"]');

    await entityIcon.dragTo(canvas);

    await page.getByText('Entidad', { exact: true }).click();

    await page
        .getByRole('button', { name: 'Marcar como entidad débil' })
        .click();

    await expect(page.getByText('Entidad marcada como débil')).toBeVisible();

    await expect
        .poll(async () => {
            const entity = await getPersistedEntity(page);
            return entity?.weak;
        })
        .toBe(true);

    await page.getByRole('button', { name: 'Quitar entidad débil' }).click();

    await expect(page.getByText('Entidad marcada como fuerte')).toBeVisible();

    await expect
        .poll(async () => {
            const entity = await getPersistedEntity(page);
            return entity?.weak;
        })
        .toBe(false);

    const entity = await getPersistedEntity(page);

    expect(entity.ownerEntityId).toBeNull();
    expect(entity.identifyingRelationId).toBeNull();
});

test('first attribute added to a weak entity is persisted as discriminant', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('svg');
    const entityIcon = page.locator('img[src="images/rectangle.png"]');

    await entityIcon.dragTo(canvas);

    await page.getByText('Entidad', { exact: true }).click();

    await page
        .getByRole('button', { name: 'Marcar como entidad débil' })
        .click();

    await expect(page.getByText('Entidad marcada como débil')).toBeVisible();

    await page.getByRole('button', { name: 'Añadir atributo' }).click();

    await expect(page.getByText('Atributo insertado')).toBeVisible();

    await expect
        .poll(async () => {
            const entity = await getPersistedEntity(page);
            return entity?.attributes?.[0];
        })
        .toMatchObject({
            name: 'Atributo',
            key: false,
            partialKey: true,
        });

    await page.getByText('Atributo', { exact: true }).click();

    await expect(
        page.getByRole('button', { name: 'Quitar discriminante' }),
    ).toBeVisible();
});