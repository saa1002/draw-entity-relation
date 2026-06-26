export const buildDecoratorCellId = (baseCellId, suffix) =>
    `${baseCellId}${suffix}`;

export const getBaseCellIdFromDecoratorId = (decoratorId, suffix) => {
    const id = String(decoratorId ?? "");

    if (!id.endsWith(suffix)) {
        return null;
    }

    return id.slice(0, -suffix.length);
};

export const isDecoratorCellForSuffix = (cell, suffix) =>
    getBaseCellIdFromDecoratorId(cell?.id, suffix) !== null;

export const getInsetBounds = (geometry, offset) => {
    if (!geometry) {
        return null;
    }

    return {
        x: geometry.x + offset,
        y: geometry.y + offset,
        width: Math.max(1, geometry.width - offset * 2),
        height: Math.max(1, geometry.height - offset * 2),
    };
};

export const applyBoundsToCellGeometry = (cell, bounds) => {
    if (!cell?.geometry || !bounds) {
        return false;
    }

    cell.geometry.x = bounds.x;
    cell.geometry.y = bounds.y;
    cell.geometry.width = bounds.width;
    cell.geometry.height = bounds.height;

    return true;
};

const disablePointerEventsForCell = (graph, cell) => {
    const state = graph?.view?.getState?.(cell);

    const nodes = [state?.shape?.node, state?.text?.node].filter(Boolean);

    nodes.forEach((node) => {
        node.setAttribute("pointer-events", "none");
        node.style.pointerEvents = "none";

        node.querySelectorAll?.("*").forEach((childNode) => {
            childNode.setAttribute("pointer-events", "none");
            childNode.style.pointerEvents = "none";
        });
    });
};

export const syncVertexDecoratorBounds = ({
    graph,
    decoratorCell,
    bounds,
    orderBack = false,
    disablePointerEvents = false,
}) => {
    if (!applyBoundsToCellGeometry(decoratorCell, bounds)) {
        return false;
    }

    graph.refresh(decoratorCell);
    graph.orderCells(orderBack, [decoratorCell]);

    if (disablePointerEvents) {
        disablePointerEventsForCell(graph, decoratorCell);
    }

    return true;
};
