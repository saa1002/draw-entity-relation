import { expect } from '@playwright/test';

import {
    getSavedAttribute,
    getSavedEntity,
    getSavedRelation,
} from './diagramState';

export async function enableMxGraphDebug(page) {
    await page.addInitScript(() => {
        window.__PW__ = true;
    });
}

export async function clearGraphSelection(page) {
    await page.evaluate(() => {
        window.__DEBUG_GRAPH__?.clearSelection?.();
    });
}

export async function selectGraphCellsByIds(page, cellIds) {
    await page.evaluate((ids) => {
        const graph = window.__DEBUG_GRAPH__;
        const cells = ids
            .map((cellId) => graph.getModel().getCell(cellId))
            .filter(Boolean);

        graph.setSelectionCells(cells);
    }, cellIds);
}

export async function getGraphCellValue(page, cellId) {
    return page.evaluate((id) => {
        const graph = window.__DEBUG_GRAPH__;
        return graph.getModel().getCell(id)?.value;
    }, cellId);
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