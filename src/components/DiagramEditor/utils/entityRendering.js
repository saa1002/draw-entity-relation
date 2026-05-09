import { getEntityDimensions } from "./mxStyles/diagramStyles";

export const WEAK_ENTITY_DECORATOR_SUFFIX = "__weak_decorator";

const WEAK_ENTITY_DECORATOR_OFFSET = 4;

export const getWeakEntityDecoratorId = (entityId) =>
    `${entityId}${WEAK_ENTITY_DECORATOR_SUFFIX}`;

export const isWeakEntityDecoratorCell = (cell) =>
    !!cell?.id && String(cell.id).endsWith(WEAK_ENTITY_DECORATOR_SUFFIX);

export const createEntityRenderingHelpers = ({ graph, accessCell }) => {
    const syncWeakEntityDecorator = (entityCell) => {
        if (!entityCell) return;

        const decorator = accessCell(getWeakEntityDecoratorId(entityCell.id));

        if (!decorator || !decorator.geometry || !entityCell.geometry) return;

        decorator.geometry.x =
            entityCell.geometry.x + WEAK_ENTITY_DECORATOR_OFFSET;
        decorator.geometry.y =
            entityCell.geometry.y + WEAK_ENTITY_DECORATOR_OFFSET;
        decorator.geometry.width = Math.max(
            1,
            entityCell.geometry.width - WEAK_ENTITY_DECORATOR_OFFSET * 2,
        );
        decorator.geometry.height = Math.max(
            1,
            entityCell.geometry.height - WEAK_ENTITY_DECORATOR_OFFSET * 2,
        );

        graph.refresh(decorator);
        graph.orderCells(false, [decorator]);
    };

    const createWeakEntityDecorator = (entity) => {
        const { width, height } = getEntityDimensions(entity.name);

        return graph.insertVertex(
            null,
            getWeakEntityDecoratorId(entity.idMx),
            "",
            entity.position.x + WEAK_ENTITY_DECORATOR_OFFSET,
            entity.position.y + WEAK_ENTITY_DECORATOR_OFFSET,
            Math.max(1, width - WEAK_ENTITY_DECORATOR_OFFSET * 2),
            Math.max(1, height - WEAK_ENTITY_DECORATOR_OFFSET * 2),
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
