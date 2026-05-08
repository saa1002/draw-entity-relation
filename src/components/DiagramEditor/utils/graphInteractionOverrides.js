import {
    DISCRIMINANT_UNDERLINE_SUFFIX,
    isDiscriminantUnderlineCell,
} from "./attributeRendering";
import {
    WEAK_ENTITY_DECORATOR_SUFFIX,
    isWeakEntityDecoratorCell,
} from "./entityRendering";
import {
    IDENTIFYING_RELATION_DECORATOR_SUFFIX,
    IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX,
    isIdentifyingRelationDecoratorCell,
    isIdentifyingRelationEdgeDecoratorCell,
} from "./relationRendering";

const getUnderlyingInteractiveCell = ({ cell, accessCell }) => {
    if (!cell?.id) return cell;

    const id = String(cell.id);

    if (id.endsWith(WEAK_ENTITY_DECORATOR_SUFFIX)) {
        return accessCell(id.slice(0, -WEAK_ENTITY_DECORATOR_SUFFIX.length));
    }

    if (id.endsWith(IDENTIFYING_RELATION_DECORATOR_SUFFIX)) {
        return accessCell(
            id.slice(0, -IDENTIFYING_RELATION_DECORATOR_SUFFIX.length),
        );
    }

    if (id.endsWith(IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX)) {
        return accessCell(
            id.slice(0, -IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX.length),
        );
    }

    if (id.endsWith(DISCRIMINANT_UNDERLINE_SUFFIX)) {
        return accessCell(id.slice(0, -DISCRIMINANT_UNDERLINE_SUFFIX.length));
    }

    return cell;
};

export const installGraphInteractionOverrides = ({
    graph,
    mxGraph,
    accessCell,
}) => {
    if (!graph || !mxGraph || !accessCell) {
        return () => {};
    }

    mxGraph.prototype.isCellSelectable = function (cell) {
        if (
            this.model.isEdge(cell) ||
            isWeakEntityDecoratorCell(cell) ||
            isIdentifyingRelationDecoratorCell(cell) ||
            isIdentifyingRelationEdgeDecoratorCell(cell) ||
            isDiscriminantUnderlineCell(cell)
        ) {
            return false;
        }

        return this.isCellsSelectable() && !this.isCellLocked(cell);
    };

    const originalGetCellForEvent = graph.getCellForEvent;

    graph.getCellForEvent = function (evt) {
        const cell = originalGetCellForEvent.call(this, evt);

        return getUnderlyingInteractiveCell({
            cell,
            accessCell,
        });
    };

    const originalGetInitialCellForEvent =
        graph.graphHandler.getInitialCellForEvent;

    graph.graphHandler.getInitialCellForEvent = function (me) {
        const cell = originalGetInitialCellForEvent.call(this, me);

        return getUnderlyingInteractiveCell({
            cell,
            accessCell,
        });
    };

    const originalDblClick = graph.dblClick;

    graph.dblClick = function (evt, cell) {
        const interactiveCell = getUnderlyingInteractiveCell({
            cell,
            accessCell,
        });

        originalDblClick.call(this, evt, interactiveCell);
    };

    return () => {
        graph.getCellForEvent = originalGetCellForEvent;
        graph.graphHandler.getInitialCellForEvent =
            originalGetInitialCellForEvent;
        graph.dblClick = originalDblClick;
    };
};
