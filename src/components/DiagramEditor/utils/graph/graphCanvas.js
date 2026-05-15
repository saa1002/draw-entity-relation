export const removeExistingGraphCells = (graph, cells) => {
    if (!graph?.removeCells) return;

    const cellsToRemove = (Array.isArray(cells) ? cells : [cells]).filter(
        Boolean,
    );

    if (cellsToRemove.length === 0) return;

    graph.removeCells(cellsToRemove);
};

export const clearGraphCanvas = (graph) => {
    if (!graph?.model?.cells) return;

    const cellsToRemove = Object.keys(graph.model.cells)
        .filter((key) => key !== "0" && key !== "1")
        .map((key) => graph.model.cells[key])
        .filter(Boolean);

    if (cellsToRemove.length === 0) return;

    removeExistingGraphCells(graph, cellsToRemove);
};

export const getConfiguredRelationGraphCells = ({ relation, accessCell }) => {
    if (!relation || typeof accessCell !== "function") return [];

    return [
        relation.side1?.idMx,
        relation.side2?.idMx,
        relation.side1?.edgeId,
        relation.side2?.edgeId,
    ]
        .map((cellId) => accessCell(cellId))
        .filter(Boolean);
};

const DEFAULT_RELATION_CARDINALITY = "X:X";

const connectRelationSideGraphCell = ({
    graph,
    relationCell,
    relation,
    sideKey,
    entityCell,
    cardinalityStyle,
}) => {
    const cardinality =
        relation[sideKey].cardinality || DEFAULT_RELATION_CARDINALITY;

    const edge = graph.insertEdge(
        relationCell,
        null,
        null,
        relationCell,
        entityCell,
    );

    const cardinalityCell = graph.insertVertex(
        edge,
        null,
        cardinality,
        0,
        0,
        1,
        1,
        cardinalityStyle,
        true,
    );

    graph.updateCellSize(cardinalityCell);

    relation[sideKey].cardinality = cardinality;
    relation[sideKey].idMx = cardinalityCell.id;
    relation[sideKey].edgeId = edge.id;
    relation[sideKey].cell = cardinalityCell.id;
    relation[sideKey].entity.idMx = entityCell.id;

    return { edge, cardinalityCell };
};

export const connectRelationGraphSides = ({
    graph,
    relationCell,
    relation,
    side1EntityCell,
    side2EntityCell,
    cardinalityStyle,
    syncSelfRelationEdges,
}) => {
    if (
        !graph ||
        !relationCell ||
        !relation ||
        !side1EntityCell ||
        !side2EntityCell
    ) {
        return null;
    }

    const side1 = connectRelationSideGraphCell({
        graph,
        relationCell,
        relation,
        sideKey: "side1",
        entityCell: side1EntityCell,
        cardinalityStyle,
    });

    const side2 = connectRelationSideGraphCell({
        graph,
        relationCell,
        relation,
        sideKey: "side2",
        entityCell: side2EntityCell,
        cardinalityStyle,
    });

    if (side1EntityCell === side2EntityCell) {
        syncSelfRelationEdges?.(relationCell, relation);
    }

    graph.orderCells(true, [side1.edge, side2.edge]);

    return {
        side1,
        side2,
    };
};

export const installCellGeometrySyncHandlers = ({
    graph,
    mxEvent,
    getSelectedCell,
    getDiagram,
    accessCell,
    isEntityShapeCell,
    isRelationShapeCell,
    isAttributeShapeCell,
    isWeakEntityDecoratorCell,
    isIdentifyingRelationDecoratorCell,
    findEntityById,
    findRelationById,
    findAttributeTreeOwnerById,
    isWeakEntity,
    isSelfRelation,
    isIdentifyingRelation,
    canRelationHoldAttributes,
    updateAttributePosition,
    syncOwnerAttributePositions,
    syncAttributeChildrenPositions,
    syncWeakEntityDecorator,
    syncSelfRelationEdges,
    syncIdentifyingRelationDecorator,
    syncIdentifyingRelationEdgeDecorator,
    syncMultivaluedAttributeDecorator,
    syncDiscriminantUnderline,
    refreshGraph,
    syncAndPersistDiagramData,
}) => {
    const handleEntityMove = (cell) => {
        const entityData = findEntityById(getDiagram(), cell.id);

        if (!entityData) return;

        syncOwnerAttributePositions(entityData, cell);

        if (isWeakEntity(entityData)) {
            syncWeakEntityDecorator(cell);
        }

        if (entityData.identifyingRelationId) {
            const relationData = findRelationById(
                getDiagram(),
                entityData.identifyingRelationId,
            );
            const relationCell = accessCell(relationData?.idMx);

            if (relationData && relationCell) {
                syncIdentifyingRelationEdgeDecorator(
                    relationCell,
                    relationData,
                );
            }
        }

        refreshGraph();
    };

    const handleRelationMove = (cell) => {
        const relationData = findRelationById(getDiagram(), cell.id);

        if (!relationData) return;

        if (canRelationHoldAttributes(relationData)) {
            syncOwnerAttributePositions(relationData, cell);
            refreshGraph();
        }

        if (isSelfRelation(relationData)) {
            syncSelfRelationEdges(cell, relationData);
        }

        if (isIdentifyingRelation(relationData)) {
            syncIdentifyingRelationDecorator(cell);
            syncIdentifyingRelationEdgeDecorator(cell, relationData);
        }
    };

    const handleAttributeMove = (cell) => {
        const attributeOwner = findAttributeTreeOwnerById(
            getDiagram(),
            cell.id,
        );

        if (!attributeOwner) return;

        const { owner, parent, attribute } = attributeOwner;
        const positionOwner = parent ?? owner;

        updateAttributePosition({
            attribute,
            owner: positionOwner,
            position: cell.geometry,
        });

        syncAttributeChildrenPositions(attribute, cell);

        if (attribute.multivalued) {
            syncMultivaluedAttributeDecorator(cell);
        }

        if (attribute.partialKey) {
            syncDiscriminantUnderline(cell);
        }
    };

    const handleCellsResized = (_sender, evt) => {
        const cells = evt.getProperty("cells") || [];

        cells.forEach((cell) => {
            if (isEntityShapeCell(cell) && !isWeakEntityDecoratorCell(cell)) {
                const entityData = findEntityById(getDiagram(), cell.id);

                if (isWeakEntity(entityData)) {
                    syncWeakEntityDecorator(cell);
                }

                if (entityData?.identifyingRelationId) {
                    const relationData = findRelationById(
                        getDiagram(),
                        entityData.identifyingRelationId,
                    );
                    const relationCell = accessCell(relationData?.idMx);

                    if (relationData && relationCell) {
                        syncIdentifyingRelationEdgeDecorator(
                            relationCell,
                            relationData,
                        );
                    }
                }
            }

            if (
                isRelationShapeCell(cell) &&
                !isIdentifyingRelationDecoratorCell(cell)
            ) {
                const relationData = findRelationById(getDiagram(), cell.id);

                if (!relationData) return;

                if (isSelfRelation(relationData)) {
                    syncSelfRelationEdges(cell, relationData);
                }

                if (isIdentifyingRelation(relationData)) {
                    syncIdentifyingRelationDecorator(cell);
                    syncIdentifyingRelationEdgeDecorator(cell, relationData);
                }
            }
        });

        refreshGraph();
        syncAndPersistDiagramData();
    };

    const handleCellsMoved = () => {
        const selectedCell = getSelectedCell();

        if (selectedCell) {
            if (
                isEntityShapeCell(selectedCell) &&
                !isWeakEntityDecoratorCell(selectedCell)
            ) {
                handleEntityMove(selectedCell);
            } else if (
                isRelationShapeCell(selectedCell) &&
                !isIdentifyingRelationDecoratorCell(selectedCell)
            ) {
                handleRelationMove(selectedCell);
            } else if (isAttributeShapeCell(selectedCell)) {
                handleAttributeMove(selectedCell);
            }
        }

        syncAndPersistDiagramData();
    };

    graph.addListener(mxEvent.CELLS_MOVED, handleCellsMoved);
    graph.addListener(mxEvent.CELLS_RESIZED, handleCellsResized);

    return () => {
        graph.removeListener(handleCellsMoved);
        graph.removeListener(handleCellsResized);
    };
};
