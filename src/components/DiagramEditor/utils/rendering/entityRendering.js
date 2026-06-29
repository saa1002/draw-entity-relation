import { getEntityDimensions } from "../mxStyles/diagramStyles";
import {
    buildDecoratorCellId,
    getInsetBounds,
    isDecoratorCellForSuffix,
    syncVertexDecoratorBounds,
} from "./decoratorRendering";

// Rendering helpers for entities and weak-entity decorators.
export const WEAK_ENTITY_DECORATOR_SUFFIX = "__weak_decorator";

const WEAK_ENTITY_DECORATOR_OFFSET = 4;

const getWeakEntityDecoratorBounds = (entityGeometry) =>
    getInsetBounds(entityGeometry, WEAK_ENTITY_DECORATOR_OFFSET);

export const getWeakEntityDecoratorId = (entityId) =>
    buildDecoratorCellId(entityId, WEAK_ENTITY_DECORATOR_SUFFIX);

export const isWeakEntityDecoratorCell = (cell) =>
    isDecoratorCellForSuffix(cell, WEAK_ENTITY_DECORATOR_SUFFIX);

export const createEntityRenderingHelpers = ({ graph, accessCell }) => {
    // The weak-entity double rectangle is a separate decorator cell kept aligned
    // with the entity vertex.
    const syncWeakEntityDecorator = (entityCell) => {
        if (!entityCell) return;

        const decorator = accessCell(getWeakEntityDecoratorId(entityCell.id));
        const bounds = getWeakEntityDecoratorBounds(entityCell.geometry);

        syncVertexDecoratorBounds({
            graph,
            decoratorCell: decorator,
            bounds,
        });
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
    // Ensure helpers are idempotent: they either synchronize an existing decorator
    // or create it and then synchronize it.
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
