import { expect } from '@playwright/test';

export async function getSavedDiagram(page) {
    return page.evaluate(() => {
        const savedDiagram = JSON.parse(
            window.localStorage.getItem('diagramData') ||
                '{"entities":[],"relations":[]}',
        );
        
        return {
            ...savedDiagram,
            entities: savedDiagram.entities || [],
            relations: savedDiagram.relations || [],
        };
    });
}

export async function getSavedEntity(page, entityName = 'Entidad') {
    const diagram = await getSavedDiagram(page);

    return diagram.entities.find((entity) => entity.name === entityName);
}

export async function getSavedRelation(page, relationName = 'Relación') {
    const diagram = await getSavedDiagram(page);

    return diagram.relations.find((relation) => relation.name === relationName);
}

export async function expectSavedEntityToExist(page, entityName = 'Entidad') {
    await expect
        .poll(async () => Boolean(await getSavedEntity(page, entityName)))
        .toBe(true);
}

export async function expectSavedRelationToExist(
    page,
    relationName = 'Relación',
) {
    await expect
        .poll(async () => Boolean(await getSavedRelation(page, relationName)))
        .toBe(true);
}

export async function expectSavedEntityToMatch(
    page,
    entityName = 'Entidad',
    expected,
) {
    await expect
        .poll(async () => getSavedEntity(page, entityName))
        .toMatchObject(expected);
}

export async function expectSavedRelationToMatch(
    page,
    relationName = 'Relación',
    expected,
) {
    await expect
        .poll(async () => getSavedRelation(page, relationName))
        .toMatchObject(expected);
}

export async function expectSavedEntityAttributeToMatch(
    page,
    entityName,
    attributeIndex,
    expected,
) {
    await expect
        .poll(async () => {
            const entity = await getSavedEntity(page, entityName);

            return entity?.attributes?.[attributeIndex];
        })
        .toMatchObject(expected);
}

export async function expectSavedDiagramState(page, getState, expectedState) {
    await expect
        .poll(async () => {
            const diagram = await getSavedDiagram(page);

            return getState(diagram);
        })
        .toEqual(expectedState);
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

    await expectSavedEntityToExist(page, name);

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

    await expectSavedRelationToExist(page, name);

    await deselectCanvas(page);
}

export async function selectEntity(page, entityName) {
    await page.getByText(entityName, { exact: true }).click();
}

export async function selectRelation(page, relationName) {
    await page.getByText(relationName, { exact: true }).click();
}

export async function markEntityAsWeak(page, entityName = 'Entidad') {
    await selectEntity(page, entityName);

    await page
        .getByRole('button', { name: 'Marcar como entidad débil' })
        .click();

    await expect(page.getByText('Entidad marcada como débil')).toBeVisible();
}

export async function unmarkSelectedWeakEntity(page) {
    await page.getByRole('button', { name: 'Quitar entidad débil' }).click();

    await expect(page.getByText('Entidad marcada como fuerte')).toBeVisible();
}

export async function addAttributeToSelectedEntity(page) {
    await page.getByRole('button', { name: 'Añadir atributo' }).click();

    await expect(page.getByText('Atributo insertado')).toBeVisible();
}

export async function openRelationConfigDialog(
    page,
    relationName = 'Relación',
) {
    await selectRelation(page, relationName);
    await page.getByRole('button', { name: 'Configurar relación' }).click();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Configurar relación')).toBeVisible();

    return dialog;
}

export async function selectRelationSide(page, dialog, sideId, entityName) {
    await dialog.locator(`#${sideId}`).click();
    await page.getByRole('option', { name: entityName, exact: true }).click();
}

export async function configureRelationSides(
    page,
    relationName,
    side1Name,
    side2Name,
) {
    const dialog = await openRelationConfigDialog(page, relationName);

    await selectRelationSide(page, dialog, 'side1', side1Name);
    await selectRelationSide(page, dialog, 'side2', side2Name);

    const acceptBtn = dialog.getByRole('button', { name: 'Aceptar' });
    await expect(acceptBtn).toBeEnabled();

    await acceptBtn.click();
    await expect(dialog).toBeHidden();
}

export async function openRelationCardinalitiesDialog(
    page,
    relationName = 'Relación',
) {
    await selectRelation(page, relationName);
    await page
        .getByRole('button', { name: 'Configurar cardinalidades' })
        .click();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Configurar cardinalidades')).toBeVisible();

    return dialog;
}

export async function selectRelationCardinality(
    page,
    dialog,
    sideId,
    cardinality,
) {
    await dialog.locator(`#${sideId}`).click();
    await page.getByRole('option', { name: cardinality, exact: true }).click();
}

export async function configureRelationCardinalities(
    page,
    relationName,
    side1Cardinality,
    side2Cardinality,
) {
    const dialog = await openRelationCardinalitiesDialog(page, relationName);

    await selectRelationCardinality(
        page,
        dialog,
        'side1-to-side2',
        side1Cardinality,
    );
    await selectRelationCardinality(
        page,
        dialog,
        'side2-to-side1',
        side2Cardinality,
    );

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