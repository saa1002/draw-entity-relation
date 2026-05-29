import {
    getRelationSideKeys,
    getRelationSideLabelDisplayValue,
} from "../../../../domain/er/relations";
import { getIsaEdgeStyleString } from "../mxStyles/diagramStyles";

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

    return getRelationSideKeys(relation)
        .flatMap((sideKey) => [
            relation[sideKey]?.idMx,
            relation[sideKey]?.edgeId,
        ])
        .map((cellId) => accessCell(cellId))
        .filter(Boolean);
};

export const getConfiguredIsaGraphCells = ({ isa, accessCell }) => {
    if (!isa || typeof accessCell !== "function") return [];

    const edgeIds = [
        isa.generalization?.edgeId,
        ...(isa.specializations ?? []).map(
            (specialization) => specialization?.edgeId,
        ),
    ];

    return edgeIds.map((cellId) => accessCell(cellId)).filter(Boolean);
};

const connectIsaLinkGraphCell = ({ graph, isaCell, link, entityCell }) => {
    const edge = graph.insertEdge(
        isaCell,
        null,
        null,
        isaCell,
        entityCell,
        getIsaEdgeStyleString(),
    );

    link.edgeId = edge.id;
    link.entity.idMx = entityCell.id;

    return edge;
};

export const connectIsaGraphLinks = ({
    graph,
    isaCell,
    isa,
    generalizationEntityCell,
    specializationEntityCells = [],
}) => {
    if (
        !graph ||
        !isaCell ||
        !isa ||
        !generalizationEntityCell ||
        specializationEntityCells.length === 0
    ) {
        return null;
    }

    const edges = [
        connectIsaLinkGraphCell({
            graph,
            isaCell,
            link: isa.generalization,
            entityCell: generalizationEntityCell,
        }),
        ...specializationEntityCells.map((entityCell, index) =>
            connectIsaLinkGraphCell({
                graph,
                isaCell,
                link: isa.specializations[index],
                entityCell,
            }),
        ),
    ];

    graph.orderCells(true, edges);

    return edges;
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

    relation[sideKey].cardinality = cardinality;

    const sideLabel = getRelationSideLabelDisplayValue(relation, sideKey, {
        fallbackCardinality: DEFAULT_RELATION_CARDINALITY,
    });

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
        sideLabel,
        0,
        0,
        1,
        1,
        cardinalityStyle,
        true,
    );

    graph.updateCellSize(cardinalityCell);

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
    side3EntityCell,
    cardinalityStyle,
    syncSelfRelationEdges,
    syncRepeatedParticipantRelationEdges,
}) => {
    const sideKeys = getRelationSideKeys(relation);
    const entityCellsBySideKey = {
        side1: side1EntityCell,
        side2: side2EntityCell,
        side3: side3EntityCell,
    };

    if (
        !graph ||
        !relationCell ||
        !relation ||
        sideKeys.some((sideKey) => !entityCellsBySideKey[sideKey])
    ) {
        return null;
    }

    const connectedSides = sideKeys.reduce((result, sideKey) => {
        result[sideKey] = connectRelationSideGraphCell({
            graph,
            relationCell,
            relation,
            sideKey,
            entityCell: entityCellsBySideKey[sideKey],
            cardinalityStyle,
        });

        return result;
    }, {});

    const syncRepeatedEdges =
        syncRepeatedParticipantRelationEdges ?? syncSelfRelationEdges;

    syncRepeatedEdges?.(relationCell, relation);

    graph.orderCells(
        true,
        Object.values(connectedSides).map((side) => side.edge),
    );

    return connectedSides;
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
    syncAttributeVisualRepresentation,
    syncWeakEntityDecorator,
    syncSelfRelationEdges,
    syncRepeatedParticipantRelationEdges,
    syncIdentifyingRelationDecorator,
    syncIdentifyingRelationEdgeDecorator,
    syncMultivaluedAttributeDecorator,
    syncDiscriminantUnderline,
    refreshGraph,
    syncAndPersistDiagramData,
}) => {
    const syncRepeatedEdges =
        syncRepeatedParticipantRelationEdges ?? syncSelfRelationEdges;

    const relationInvolvesEntityCell = (relationData, entityCell) =>
        getRelationSideKeys(relationData).some(
            (sideKey) =>
                relationData?.[sideKey]?.entity?.idMx === entityCell?.id,
        );

    const syncRepeatedParticipantRelationEdgesForEntity = (entityCell) => {
        (getDiagram()?.relations ?? [])
            .filter((relationData) =>
                relationInvolvesEntityCell(relationData, entityCell),
            )
            .forEach((relationData) => {
                const relationCell = accessCell(relationData.idMx);

                syncRepeatedEdges?.(relationCell, relationData);
            });
    };

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

        syncRepeatedParticipantRelationEdgesForEntity(cell);

        refreshGraph();
    };

    const handleRelationMove = (cell) => {
        const relationData = findRelationById(getDiagram(), cell.id);

        if (!relationData) return;

        if (canRelationHoldAttributes(relationData)) {
            syncOwnerAttributePositions(relationData, cell);
            refreshGraph();
        }

        syncRepeatedEdges?.(cell, relationData);

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

        const rootAttribute = attributeOwner.ancestors?.at(0) ?? attribute;

        syncAttributeVisualRepresentation?.(rootAttribute);

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

                syncRepeatedParticipantRelationEdgesForEntity(cell);
            }

            if (
                isRelationShapeCell(cell) &&
                !isIdentifyingRelationDecoratorCell(cell)
            ) {
                const relationData = findRelationById(getDiagram(), cell.id);

                if (!relationData) return;

                syncRepeatedEdges?.(cell, relationData);

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

export const removeEntityGraphCells = ({
    graph,
    entity,
    accessCell,
    getAttributesCells,
    getWeakEntityDecoratorId,
    isWeakEntity,
}) => {
    if (!entity) return;

    const entityCell = accessCell(entity.idMx);

    if (!entityCell) return;

    const weakEntityDecorator = isWeakEntity(entity)
        ? accessCell(getWeakEntityDecoratorId(entity.idMx))
        : null;

    const attributeCells = getAttributesCells(entity.attributes);

    removeExistingGraphCells(graph, [
        weakEntityDecorator,
        entityCell,
        ...attributeCells,
    ]);
};

export const removeRelationConfigurationGraphCells = ({
    graph,
    relation,
    accessCell,
    getAttributesCells,
}) => {
    if (!relation) return;

    const relationAttributeCells = getAttributesCells(relation.attributes);

    removeExistingGraphCells(graph, [
        ...getConfiguredRelationGraphCells({ relation, accessCell }),
        ...relationAttributeCells,
    ]);
};

export const removeRelationGraphCells = ({
    graph,
    relation,
    accessCell,
    getAttributesCells,
}) => {
    if (!relation) return;

    const relationCell = accessCell(relation.idMx);

    if (!relationCell) return;

    const relationAttributeCells = getAttributesCells(relation.attributes);

    removeExistingGraphCells(graph, [
        relationCell,
        ...getConfiguredRelationGraphCells({ relation, accessCell }),
        ...relationAttributeCells,
    ]);
};

export const removeIsaGraphCells = ({ graph, isa, accessCell }) => {
    if (!isa) return;

    const isaCell = accessCell(isa.idMx);

    if (!isaCell) return;

    removeExistingGraphCells(graph, [
        isaCell,
        ...getConfiguredIsaGraphCells({ isa, accessCell }),
    ]);
};
