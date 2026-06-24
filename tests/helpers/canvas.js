import { expect } from '@playwright/test';

import {
    expectSavedEntityToExist,
    expectSavedIsaToExist,
    expectSavedRelationToExist,
} from './diagramState';

export {
    expectAttributeCellVisible,
    expectSavedDiagramState,
    expectSavedEntityAttributeToMatch,
    expectSavedEntityToMatch,
    expectSavedIsaToExist,
    expectSavedRelationAttributeToMatch,
    expectSavedRelationToExist,
    expectSavedRelationToMatch,
    getSavedAttribute,
    getSavedDiagram,
    getSavedEntity,
    getSavedIsa,
    getSavedRelation,
} from './diagramState';

export {
    clearGraphSelection,
    clickCompositeAttributeConnector,
    dragCompositeAttributeRootEdge,
    enableMxGraphDebug,
    getGraphCellValue,
    selectAttributeByName,
    selectAttributesByName,
    selectGraphCellsByIds,
} from './canvasGraph';

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

export async function addIsa(page, position = { x: 360, y: 300 }) {
    const canvas = page.locator('svg');

    await page.locator('img[src="images/triangle.png"]').dragTo(canvas, {
        targetPosition: position,
    });

    await expectSavedIsaToExist(page);

    await deselectCanvas(page);
}

export async function selectEntity(page, entityName) {
    await page
        .locator('svg text')
        .filter({ hasText: new RegExp(`^${entityName}$`) })
        .click();
}

export async function selectRelation(page, relationName) {
    await page
        .locator('svg text')
        .filter({ hasText: new RegExp(`^${relationName}$`) })
        .click();
}

export async function selectIsa(page, isaIndex = 0) {
    await page.getByText('ISA', { exact: true }).nth(isaIndex).click();
}

export async function renameElement(page, currentName, newName) {
    await page.getByText(currentName, { exact: true }).first().dblclick();

    const editor = page.locator('.mxCellEditor');

    await expect(editor).toBeVisible();

    await editor.press('Control+A');
    await editor.type(newName);

    await page.locator('svg').click({ position: { x: 20, y: 20 } });
}

export async function addAttributeToSelectedElement(page) {
    await page.getByRole('button', { name: 'Añadir atributo' }).click();

    await expect(page.getByText('Atributo insertado').last()).toBeVisible();
}

export async function addAttributeToSelectedEntity(page) {
    await addAttributeToSelectedElement(page);
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

export async function selectRelationArity(page, dialog, arityName) {
    await dialog.locator('#relation-arity').click();
    await page.getByRole('option', { name: arityName, exact: true }).click();
}

export async function selectRelationSide(page, dialog, sideId, entityName) {
    await dialog.locator(`#${sideId}`).click();
    await page.getByRole('option', { name: entityName, exact: true }).click();
}

export async function fillRelationSideRole(dialog, sideId, role) {
    await dialog.locator(`#${sideId}-role`).fill(role);
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

export async function configureTernaryRelationSides(
    page,
    relationName,
    side1Name,
    side2Name,
    side3Name,
    { side1Role = '', side2Role = '', side3Role = '' } = {},
) {
    const dialog = await openRelationConfigDialog(page, relationName);

    await selectRelationArity(page, dialog, 'Ternaria');
    await selectRelationSide(page, dialog, 'side1', side1Name);
    await selectRelationSide(page, dialog, 'side2', side2Name);
    await selectRelationSide(page, dialog, 'side3', side3Name);

    if (side1Role) {
        await fillRelationSideRole(dialog, 'side1', side1Role);
    }

    if (side2Role) {
        await fillRelationSideRole(dialog, 'side2', side2Role);
    }

    if (side3Role) {
        await fillRelationSideRole(dialog, 'side3', side3Role);
    }

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

function getTernaryCardinalityOptionLabel(cardinality) {
    if (cardinality === '0:1') return '1';
    if (cardinality === '0:N') return 'N';

    return cardinality;
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

export async function configureTernaryRelationCardinalities(
    page,
    relationName,
    side1Cardinality,
    side2Cardinality,
    side3Cardinality,
) {
    const dialog = await openRelationCardinalitiesDialog(page, relationName);

    await selectRelationCardinality(
        page,
        dialog,
        'side1-to-side2',
        getTernaryCardinalityOptionLabel(side1Cardinality),
    );
    await selectRelationCardinality(
        page,
        dialog,
        'side2-to-side1',
        getTernaryCardinalityOptionLabel(side2Cardinality),
    );
    await selectRelationCardinality(
        page,
        dialog,
        'side3-cardinality',
        getTernaryCardinalityOptionLabel(side3Cardinality),
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

export async function openIsaConfigDialog(page, isaIndex = 0) {
    await selectIsa(page, isaIndex);

    await page.getByRole('button', { name: 'Configurar ISA' }).click();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Configurar ISA')).toBeVisible();

    return dialog;
}

export async function configureIsaHierarchy(
    page,
    generalizationName,
    specializationNames,
    isaIndex = 0,
) {
    const dialog = await openIsaConfigDialog(page, isaIndex);

    await dialog.locator('#isa-generalization').click();
    await page
        .getByRole('option', { name: generalizationName, exact: true })
        .click();

    await dialog.locator('#isa-specializations').click();

    for (const specializationName of specializationNames) {
        await page
            .getByRole('option', {
                name: specializationName,
                exact: true,
            })
            .click();
    }

    await page.keyboard.press('Escape');

    const acceptBtn = dialog.getByRole('button', { name: 'Aceptar' });
    await expect(acceptBtn).toBeEnabled();

    await acceptBtn.click();
    await expect(dialog).toBeHidden();

    await expect(
        page.getByText('Jerarquía ISA configurada').last(),
    ).toBeVisible();
}

export async function generateBasicStructure(
    page,
    { templateName = 'Relación N:M básica', mode = 'replace' } = {},
) {
    await page.getByRole('button', { name: 'Generar estructura' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
        dialog.getByText('Generar estructura básica', { exact: true }),
    ).toBeVisible();

    await expect(dialog.locator('#generate-structure-mode')).toBeVisible();

    if (templateName !== 'Relación N:M básica') {
        await dialog.locator('#generate-structure-template').click();

        const optionsList = page.getByRole('listbox');
        await optionsList
            .getByRole('option', { name: templateName, exact: true })
            .click();
        await expect(optionsList).toBeHidden();
    }

    if (mode === 'merge') {
        await dialog.locator('#generate-structure-mode').click();

        const optionsList = page.getByRole('listbox');
        await optionsList
            .getByRole('option', {
                name: 'Combinar con el diagrama actual',
                exact: true,
            })
            .click();
        await expect(optionsList).toBeHidden();
    }

    await dialog.getByRole('button', { name: 'Generar estructura' }).click();

    await expect(
        page.getByText(`Estructura generada: ${templateName}.`).last(),
    ).toBeVisible();
}