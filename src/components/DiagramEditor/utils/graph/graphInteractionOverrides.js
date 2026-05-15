import {
    findAttributeTreeOwnerById,
    getAttributeCellIds,
    isCompositeAttribute,
} from "../../../../domain/er";
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

const getDiagramAttributeOwners = (getDiagram) => {
    const diagram = getDiagram?.() ?? {};

    return [...(diagram.entities ?? []), ...(diagram.relations ?? [])];
};

const isCompositeAttributeConnectorCell = ({ cell, getDiagram }) => {
    if (!cell?.id) {
        return false;
    }

    const attributeOwner = findAttributeTreeOwnerById(getDiagram?.(), cell.id);
    const attribute = attributeOwner?.attribute;

    return attribute?.idMx === cell.id && isCompositeAttribute(attribute);
};

const findCompositeAttributeRootByEdgeId = ({ edgeId, getDiagram }) => {
    if (!edgeId) {
        return null;
    }

    const edgeIdAsString = String(edgeId);

    for (const owner of getDiagramAttributeOwners(getDiagram)) {
        for (const attribute of owner.attributes ?? []) {
            if (!isCompositeAttribute(attribute)) {
                continue;
            }

            const hasRootEdge = getAttributeCellIds(attribute)
                .slice(1)
                .some((cellId) => String(cellId) === edgeIdAsString);

            if (hasRootEdge) {
                return attribute;
            }
        }
    }

    return null;
};

const getCompositeAttributeRootCellFromEdge = ({
    edgeCell,
    graph,
    accessCell,
    getDiagram,
}) => {
    if (!edgeCell?.id || !graph?.getModel?.().isEdge?.(edgeCell)) {
        return null;
    }

    const compositeAttribute = findCompositeAttributeRootByEdgeId({
        edgeId: edgeCell.id,
        getDiagram,
    });

    return compositeAttribute ? accessCell(compositeAttribute.idMx) : null;
};

const getUnderlyingInteractiveCell = ({
    cell,
    graph,
    accessCell,
    getDiagram,
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

    if (
        isCompositeAttributeConnectorCell({
            cell,
            getDiagram,
        })
    ) {
        return null;
    }

    if (resolveCompositeAttributeRootEdge) {
        const compositeAttributeRootCell =
            getCompositeAttributeRootCellFromEdge({
                edgeCell: cell,
                graph,
                accessCell,
                getDiagram,
            });

        if (compositeAttributeRootCell) {
            return compositeAttributeRootCell;
        }
    }

    return cell;
};

const isCompositeAttributeInteractionCell = ({
    cell,
    graph,
    accessCell,
    getDiagram,
}) => {
    if (!cell) {
        return false;
    }

    return (
        isCompositeAttributeConnectorCell({
            cell,
            getDiagram,
        }) ||
        Boolean(
            getCompositeAttributeRootCellFromEdge({
                edgeCell: cell,
                graph,
                accessCell,
                getDiagram,
            }),
        )
    );
};

export const installGraphInteractionOverrides = ({
    graph,
    mxGraph,
    accessCell,
    getDiagram,
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
            graph,
            accessCell,
            getDiagram,
            resolveCompositeAttributeRootEdge: false,
        });
    };

    const originalGetInitialCellForEvent =
        graph.graphHandler.getInitialCellForEvent;

    graph.graphHandler.getInitialCellForEvent = function (me) {
        const cell = originalGetInitialCellForEvent.call(this, me);

        return getUnderlyingInteractiveCell({
            cell,
            graph,
            accessCell,
            getDiagram,
        });
    };

    const originalDblClick = graph.dblClick;

    graph.dblClick = function (evt, cell) {
        const interactiveCell = getUnderlyingInteractiveCell({
            cell,
            graph,
            accessCell,
            getDiagram,
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
                    graph,
                    accessCell,
                    getDiagram,
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
