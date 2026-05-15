import { getEntityDimensions } from "../mxStyles/diagramStyles";

export const WEAK_ENTITY_DECORATOR_SUFFIX = "__weak_decorator";

const WEAK_ENTITY_DECORATOR_OFFSET = 4;

const getWeakEntityDecoratorBounds = (entityGeometry) => {
    if (!entityGeometry) {
        return null;
    }

    const offset = WEAK_ENTITY_DECORATOR_OFFSET;

    return {
        x: entityGeometry.x + offset,
        y: entityGeometry.y + offset,
        width: Math.max(1, entityGeometry.width - offset * 2),
        height: Math.max(1, entityGeometry.height - offset * 2),
    };
};

export const getWeakEntityDecoratorId = (entityId) =>
    `${entityId}${WEAK_ENTITY_DECORATOR_SUFFIX}`;

export const isWeakEntityDecoratorCell = (cell) =>
    !!cell?.id && String(cell.id).endsWith(WEAK_ENTITY_DECORATOR_SUFFIX);

export const createEntityRenderingHelpers = ({ graph, accessCell }) => {
    const syncWeakEntityDecorator = (entityCell) => {
        if (!entityCell) return;

        const decorator = accessCell(getWeakEntityDecoratorId(entityCell.id));

        if (!decorator || !decorator.geometry) return;

        const bounds = getWeakEntityDecoratorBounds(entityCell.geometry);

        if (!bounds) return;

        decorator.geometry.x = bounds.x;
        decorator.geometry.y = bounds.y;
        decorator.geometry.width = bounds.width;
        decorator.geometry.height = bounds.height;

        graph.refresh(decorator);
        graph.orderCells(false, [decorator]);
    };

    const createWeakEntityDecorator = (entity) => {
        const { width, height } = getEntityDimensions(entity.name);

        const bounds = getWeakEntityDecoratorBounds({
            x: entity.position.x,
            y: entity.position.y,
            width,
            height,
        });

        if (!bounds) {
            return null;
        }

        return graph.insertVertex(
            null,
            getWeakEntityDecoratorId(entity.idMx),
            "",
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
            "weakEntityDecoratorStyle;shape=rectangle",
        );
    };

    const ensureWeakEntityDecorator = (entityCell, entityData) => {
        const existingDecorator = accessCell(
            getWeakEntityDecoratorId(entityCell.id),
        );

        if (existingDecorator) {
            syncWeakEntityDecorator(entityCell);
            return;
        }

        createWeakEntityDecorator(entityData);
        syncWeakEntityDecorator(entityCell);
    };

    const removeWeakEntityDecorator = (entityId) => {
        const decorator = accessCell(getWeakEntityDecoratorId(entityId));

        if (decorator) {
            graph.removeCells([decorator]);
        }
    };

    return {
        getWeakEntityDecoratorId,
        createWeakEntityDecorator,
        syncWeakEntityDecorator,
        ensureWeakEntityDecorator,
        removeWeakEntityDecorator,
    };
};
