import { expect } from '@playwright/test';

export async function getPersistedDiagram(page) {
    return page.evaluate(() =>
        JSON.parse(
            window.localStorage.getItem('diagramData') ||
                '{"entities":[],"relations":[]}',
        ),
    );
}

export async function getPersistedEntity(page, entityName = 'Entidad') {
    return page.evaluate((name) => {
        const diagram = JSON.parse(
            window.localStorage.getItem('diagramData') || '{"entities":[]}');

        return diagram.entities.find((entity) => entity.name === name);
    }, entityName);
}

export async function getPersistedRelation(page, relationName = 'Relación') {
    return page.evaluate((name) => {
        const diagram = JSON.parse(
            window.localStorage.getItem('diagramData') || '{"relations":[]}');

        return diagram.relations.find((relation) => relation.name === name);
    }, relationName);
}

export async function deselectCanvas(page) {
    await page.locator('svg').click({ position: { x: 20, y: 20 } });
}

export async function addEntity(
    page,
    name = 'Entidad',
    position = { x: 180, y: 180 },
) {
    const canvas = page.locator('svg');

    await page.locator('img[src="images/rectangle.png"]').dragTo(canvas, {
        targetPosition: position,
    });

    await expect
        .poll(async () => Boolean(await getPersistedEntity(page, name)))
        .toBe(true);

    await deselectCanvas(page);
}

export async function addRelation(
    page,
    name = 'Relación',
    position = { x: 300, y: 320 },
) {
    const canvas = page.locator('svg');

    await page.locator('img[src="images/rhombus.png"]').dragTo(canvas, {
        targetPosition: position,
    });

    await expect
        .poll(async () => Boolean(await getPersistedRelation(page, name)))
        .toBe(true);

    await deselectCanvas(page);
}

export async function selectEntity(page, entityName) {
    await page.getByText(entityName, { exact: true }).click();
}

export async function selectRelation(page, relationName) {
    await page.getByText(relationName, { exact: true }).click();
}

export async function markEntityAsWeak(page, entityName) {
    await selectEntity(page, entityName);

    await page
        .getByRole('button', { name: 'Marcar como entidad débil' })
        .click();

    await expect(page.getByText('Entidad marcada como débil')).toBeVisible();
}

export async function configureRelationSides(
    page,
    relationName,
    side1Name,
    side2Name,
) {
    await selectRelation(page, relationName);
    await page.getByRole('button', { name: 'Configurar relación' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Configurar relación')).toBeVisible();

    await dialog.locator('#side1').click();
    await page.getByRole('option', { name: side1Name, exact: true }).click();

    await dialog.locator('#side2').click();
    await page.getByRole('option', { name: side2Name, exact: true }).click();

    const acceptBtn = dialog.getByRole('button', { name: 'Aceptar' });
    await expect(acceptBtn).toBeEnabled();

    await acceptBtn.click();
    await expect(dialog).toBeHidden();
}

export async function markSelectedRelationAsIdentifying(page) {
    await page
        .getByRole('button', {
            name: 'Marcar como dependencia por identificación',
        })
        .click();

    await expect(
        page.getByText('Relación marcada como dependencia por identificación'),
    ).toBeVisible();
}