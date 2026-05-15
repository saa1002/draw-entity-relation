import {
    DISCRIMINANT_UNDERLINE_SUFFIX,
    MULTIVALUED_ATTRIBUTE_DECORATOR_SUFFIX,
    isDiscriminantUnderlineCell,
    isMultivaluedAttributeDecoratorCell,
} from "../rendering/attributeRendering";
import {
    WEAK_ENTITY_DECORATOR_SUFFIX,
    isWeakEntityDecoratorCell,
} from "../rendering/entityRendering";
import {
    IDENTIFYING_RELATION_DECORATOR_SUFFIX,
    IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX,
    isIdentifyingRelationDecoratorCell,
    isIdentifyingRelationEdgeDecoratorCell,
} from "../rendering/relationRendering";

import { getBaseCellIdFromDecoratorId } from "../rendering/decoratorRendering";

const INTERACTIVE_DECORATOR_SUFFIXES = [
    WEAK_ENTITY_DECORATOR_SUFFIX,
    IDENTIFYING_RELATION_DECORATOR_SUFFIX,
    IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX,
    DISCRIMINANT_UNDERLINE_SUFFIX,
    MULTIVALUED_ATTRIBUTE_DECORATOR_SUFFIX,
];

const getInteractiveBaseCellFromDecorator = ({ cell, accessCell }) => {
    if (!cell?.id) {
        return null;
    }

    for (const suffix of INTERACTIVE_DECORATOR_SUFFIXES) {
        const baseCellId = getBaseCellIdFromDecoratorId(cell.id, suffix);

        if (baseCellId !== null) {
            return accessCell(baseCellId);
        }
    }

    return null;
};

const getUnderlyingInteractiveCell = ({
    cell,
    accessCell,
    getCompositeAttributeRootCellFromEdge,
    isCompositeAttributeConnectorCell,
    resolveCompositeAttributeRootEdge = true,
}) => {
    if (!cell?.id) return cell;

    const decoratorBaseCell = getInteractiveBaseCellFromDecorator({
        cell,
        accessCell,
    });

    if (decoratorBaseCell) {
        return decoratorBaseCell;
    }

    if (isCompositeAttributeConnectorCell?.(cell)) {
        return null;
    }

    if (resolveCompositeAttributeRootEdge) {
        const compositeAttributeRootCell =
            getCompositeAttributeRootCellFromEdge?.(cell);

        if (compositeAttributeRootCell) {
            return compositeAttributeRootCell;
        }
    }

    return cell;
};

const isCompositeAttributeInteractionCell = ({
    cell,
    getCompositeAttributeRootCellFromEdge,
    isCompositeAttributeConnectorCell,
}) => {
    if (!cell) {
        return false;
    }

    return (
        isCompositeAttributeConnectorCell?.(cell) === true ||
        Boolean(getCompositeAttributeRootCellFromEdge?.(cell))
    );
};

export const installGraphInteractionOverrides = ({
    graph,
    mxGraph,
    accessCell,
    getCompositeAttributeRootCellFromEdge,
    isCompositeAttributeConnectorCell,
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
            isDiscriminantUnderlineCell(cell) ||
            isMultivaluedAttributeDecoratorCell(cell)
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
            getCompositeAttributeRootCellFromEdge,
            isCompositeAttributeConnectorCell,
            resolveCompositeAttributeRootEdge: false,
        });
    };

    const originalGetInitialCellForEvent =
        graph.graphHandler.getInitialCellForEvent;

    graph.graphHandler.getInitialCellForEvent = function (me) {
        const cell = originalGetInitialCellForEvent.call(this, me);

        return getUnderlyingInteractiveCell({
            cell,
            accessCell,
            getCompositeAttributeRootCellFromEdge,
            isCompositeAttributeConnectorCell,
        });
    };

    const originalDblClick = graph.dblClick;

    graph.dblClick = function (evt, cell) {
        const interactiveCell = getUnderlyingInteractiveCell({
            cell,
            accessCell,
            getCompositeAttributeRootCellFromEdge,
            isCompositeAttributeConnectorCell,
            resolveCompositeAttributeRootEdge: false,
        });

        originalDblClick.call(this, evt, interactiveCell);
    };

    let shouldClearCompositeAttributeSelection = false;

    const compositeAttributeSelectionCleaner = {
        mouseDown: (_sender, me) => {
            const cell = me.getCell?.();

            shouldClearCompositeAttributeSelection =
                isCompositeAttributeInteractionCell({
                    cell,
                    getCompositeAttributeRootCellFromEdge,
                    isCompositeAttributeConnectorCell,
                });
        },
        mouseMove: () => {},
        mouseUp: () => {
            if (!shouldClearCompositeAttributeSelection) {
                return;
            }

            shouldClearCompositeAttributeSelection = false;

            window.setTimeout(() => {
                graph.clearSelection();
            }, 0);
        },
    };

    graph.addMouseListener(compositeAttributeSelectionCleaner);

    return () => {
        graph.removeMouseListener(compositeAttributeSelectionCleaner);
        graph.getCellForEvent = originalGetCellForEvent;
        graph.graphHandler.getInitialCellForEvent =
            originalGetInitialCellForEvent;
        graph.dblClick = originalDblClick;
    };
};
