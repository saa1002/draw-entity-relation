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