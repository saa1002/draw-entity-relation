import { getRelationDimensions } from "./diagramStyles";

export const IDENTIFYING_RELATION_DECORATOR_SUFFIX = "__identifying_decorator";

const IDENTIFYING_RELATION_DECORATOR_OFFSET = 4;

export const getIdentifyingRelationDecoratorId = (relationId) =>
    `${relationId}${IDENTIFYING_RELATION_DECORATOR_SUFFIX}`;

export const isIdentifyingRelationDecoratorCell = (cell) =>
    !!cell?.id &&
    String(cell.id).endsWith(IDENTIFYING_RELATION_DECORATOR_SUFFIX);

export const createRelationRenderingHelpers = ({ graph, accessCell }) => {
    const syncIdentifyingRelationDecorator = (relationCell) => {
        if (!relationCell) return;

        const decorator = accessCell(
            getIdentifyingRelationDecoratorId(relationCell.id),
        );

        if (!decorator || !decorator.geometry || !relationCell.geometry) return;

        decorator.geometry.x =
            relationCell.geometry.x + IDENTIFYING_RELATION_DECORATOR_OFFSET;
        decorator.geometry.y =
            relationCell.geometry.y + IDENTIFYING_RELATION_DECORATOR_OFFSET;
        decorator.geometry.width = Math.max(
            1,
            relationCell.geometry.width -
                IDENTIFYING_RELATION_DECORATOR_OFFSET * 2,
        );
        decorator.geometry.height = Math.max(
            1,
            relationCell.geometry.height -
                IDENTIFYING_RELATION_DECORATOR_OFFSET * 2,
        );

        graph.refresh(decorator);
        graph.orderCells(false, [decorator]);
    };

    const createIdentifyingRelationDecorator = (relation) => {
        const { width, height } = getRelationDimensions(relation.name);

        return graph.insertVertex(
            null,
            getIdentifyingRelationDecoratorId(relation.idMx),
            "",
            relation.position.x + IDENTIFYING_RELATION_DECORATOR_OFFSET,
            relation.position.y + IDENTIFYING_RELATION_DECORATOR_OFFSET,
            Math.max(1, width - IDENTIFYING_RELATION_DECORATOR_OFFSET * 2),
            Math.max(1, height - IDENTIFYING_RELATION_DECORATOR_OFFSET * 2),
            "identifyingRelationDecoratorStyle;shape=rhombus",
        );
    };

    const ensureIdentifyingRelationDecorator = (relationCell, relationData) => {
        const existingDecorator = accessCell(
            getIdentifyingRelationDecoratorId(relationCell.id),
        );

        if (existingDecorator) {
            syncIdentifyingRelationDecorator(relationCell);
            return;
        }

        createIdentifyingRelationDecorator(relationData);
        syncIdentifyingRelationDecorator(relationCell);
    };

    const removeIdentifyingRelationDecorator = (relationId) => {
        const decorator = accessCell(
            getIdentifyingRelationDecoratorId(relationId),
        );

        if (decorator) {
            graph.removeCells([decorator]);
        }
    };

    return {
        syncIdentifyingRelationDecorator,
        ensureIdentifyingRelationDecorator,
        removeIdentifyingRelationDecorator,
    };
};
