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
            isas: savedDiagram.isas || [],
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

export async function getSavedIsa(page, isaIndex = 0) {
    const diagram = await getSavedDiagram(page);

    return diagram.isas?.[isaIndex] ?? null;
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

export async function expectSavedIsaToExist(page, isaIndex = 0) {
    await expect
        .poll(async () => Boolean(await getSavedIsa(page, isaIndex)))
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

export async function expectSavedRelationAttributeToMatch(
    page,
    relationName,
    attributeIndex,
    expected,
) {
    await expect
        .poll(async () => {
            const relation = await getSavedRelation(page, relationName);

            return relation?.attributes?.[attributeIndex];
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

export async function addIsa(page, position = { x: 360, y: 300 }) {
    const canvas = page.locator('svg');

    await page.locator('img[src="images/triangle.png"]').dragTo(canvas, {
        targetPosition: position,
    });

    await expectSavedIsaToExist(page);

    await deselectCanvas(page);
}

export async function selectEntity(page, entityName) {
    await page.getByText(entityName, { exact: true }).click();
}

export async function selectRelation(page, relationName) {
    await page.getByText(relationName, { exact: true }).click();
}

export async function selectIsa(page, isaIndex = 0) {
    await page.getByText('ISA', { exact: true }).nth(isaIndex).click();
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

export async function addAttributeToSelectedElement(page) {
    await page.getByRole('button', { name: 'Añadir atributo' }).click();

    await expect(page.getByText('Atributo insertado').last()).toBeVisible();
}

export async function addAttributeToSelectedEntity(page) {
    await addAttributeToSelectedElement(page);
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

export async function fillRelationSideRole(dialog, sideId, role) {
    await dialog.locator(`#${sideId}-role`).fill(role);
}

export async function selectRelationArity(page, dialog, arityName) {
    await dialog.locator('#relation-arity').click();
    await page.getByRole('option', { name: arityName, exact: true }).click();
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

export async function renameElement(page, currentName, newName) {
    await page.getByText(currentName, { exact: true }).first().dblclick();

    const editor = page.locator('.mxCellEditor');

    await expect(editor).toBeVisible();

    await editor.press('Control+A');
    await editor.type(newName);

    await page.locator('svg').click({ position: { x: 20, y: 20 } });
}

export async function enableMxGraphDebug(page) {
    await page.addInitScript(() => {
        window.__PW__ = true;
    });
}

function findAttributeByName(attributes = [], attributeName) {
    for (const attribute of attributes) {
        if (attribute.name === attributeName) {
            return attribute;
        }

        const childAttribute = findAttributeByName(
            attribute.children ?? [],
            attributeName,
        );

        if (childAttribute) {
            return childAttribute;
        }
    }

    return null;
}

export async function getSavedAttribute(page, ownerName, attributeName) {
    const diagram = await getSavedDiagram(page);

    const owner = [
        ...(diagram.entities ?? []),
        ...(diagram.relations ?? []),
    ].find((candidate) => candidate.name === ownerName);

    return findAttributeByName(owner?.attributes ?? [], attributeName);
}

export async function selectAttributeByName(page, ownerName, attributeName) {
    await expect
        .poll(async () => {
            const attribute = await getSavedAttribute(
                page,
                ownerName,
                attributeName,
            );

            return attribute?.idMx ?? null;
        })
        .not.toBeNull();

    const attribute = await getSavedAttribute(
        page,
        ownerName,
        attributeName,
    );

    await page.waitForFunction((attributeId) => {
        const graph = window.__DEBUG_GRAPH__;
        return Boolean(graph?.getModel?.()?.getCell?.(attributeId));
    }, attribute.idMx);

    await page.evaluate((attributeId) => {
        const graph = window.__DEBUG_GRAPH__;
        const cell = graph.getModel().getCell(attributeId);

        graph.setSelectionCell(cell);
    }, attribute.idMx);
}

export async function selectAttributesByName(page, ownerName, attributeNames) {
    await expect
        .poll(async () => {
            const attributes = await Promise.all(
                attributeNames.map((attributeName) =>
                    getSavedAttribute(page, ownerName, attributeName),
                ),
            );

            return attributes.every((attribute) => Boolean(attribute?.idMx));
        })
        .toBe(true);

    const attributes = await Promise.all(
        attributeNames.map((attributeName) =>
            getSavedAttribute(page, ownerName, attributeName),
        ),
    );
    const attributeIds = attributes.map((attribute) => attribute.idMx);

    await page.waitForFunction((ids) => {
        const graph = window.__DEBUG_GRAPH__;
        return ids.every((attributeId) =>
            Boolean(graph?.getModel?.()?.getCell?.(attributeId)),
        );
    }, attributeIds);

    await page.evaluate((ids) => {
        const graph = window.__DEBUG_GRAPH__;
        const cells = ids
            .map((attributeId) => graph.getModel().getCell(attributeId))
            .filter(Boolean);

        graph.setSelectionCells(cells);
    }, attributeIds);
}

export async function expectAttributeCellVisible(
    page,
    ownerName,
    attributeName,
    expectedVisible = true,
) {
    await expect
        .poll(async () => {
            const attribute = await getSavedAttribute(
                page,
                ownerName,
                attributeName,
            );

            if (!attribute?.idMx) {
                return null;
            }

            return page.evaluate((attributeId) => {
                const graph = window.__DEBUG_GRAPH__;
                const cell = graph?.getModel?.()?.getCell?.(attributeId);

                if (!cell) {
                    return null;
                }

                return cell.visible !== false;
            }, attribute.idMx);
        })
        .toBe(expectedVisible);
}

export async function dragCompositeAttributeRootEdge(
    page,
    ownerName,
    attributeName,
    deltaX,
    deltaY,
) {
    const entity = await getSavedEntity(page, ownerName);
    const relation = await getSavedRelation(page, ownerName);
    const owner = entity ?? relation;

    const attribute = owner?.attributes?.find(
        (candidate) =>
            candidate.name === attributeName &&
            Array.isArray(candidate.children) &&
            candidate.children.length > 0,
    );
    const edgeId = attribute?.cell?.[1];

    await expect(edgeId).toBeTruthy();

    const startPoint = await page.evaluate((rootEdgeId) => {
        const graph = window.__DEBUG_GRAPH__;
        const edge = graph?.getModel?.()?.getCell?.(rootEdgeId);

        if (!graph || !edge) {
            return null;
        }

        const state = graph.view.getState(edge);
        const points = state?.absolutePoints?.filter(Boolean) ?? [];

        if (points.length < 2) {
            return null;
        }

        const firstPoint = points.at(0);
        const lastPoint = points.at(-1);
        const containerBounds = graph.container.getBoundingClientRect();

        return {
            x: containerBounds.left + (firstPoint.x + lastPoint.x) / 2,
            y: containerBounds.top + (firstPoint.y + lastPoint.y) / 2,
        };
    }, edgeId);

    await expect(startPoint).not.toBeNull();

    await page.mouse.move(startPoint.x, startPoint.y);
    await page.mouse.down();
    await page.mouse.move(startPoint.x + deltaX, startPoint.y + deltaY, {
        steps: 8,
    });
    await page.mouse.up();
}

export async function clickCompositeAttributeConnector(
    page,
    ownerName,
    attributeName,
) {
    const entity = await getSavedEntity(page, ownerName);
    const relation = await getSavedRelation(page, ownerName);
    const owner = entity ?? relation;

    const attribute = owner?.attributes?.find(
        (candidate) =>
            candidate.name === attributeName &&
            Array.isArray(candidate.children) &&
            candidate.children.length > 0,
    );

    await expect(attribute?.idMx).toBeTruthy();

    const centerPoint = await page.evaluate((attributeId) => {
        const graph = window.__DEBUG_GRAPH__;
        const cell = graph?.getModel?.()?.getCell?.(attributeId);

        if (!graph || !cell) {
            return null;
        }

        const state = graph.view.getState(cell);
        const bounds = state ?? cell.geometry;

        if (!bounds) {
            return null;
        }

        const containerBounds = graph.container.getBoundingClientRect();

        return {
            x: containerBounds.left + bounds.x + bounds.width / 2,
            y: containerBounds.top + bounds.y + bounds.height / 2,
        };
    }, attribute.idMx);

    await expect(centerPoint).not.toBeNull();

    await page.mouse.click(centerPoint.x, centerPoint.y);
}

