import { getRelationSideKeys } from "../../../../domain/er/relations";
import { ER_STROKE, getRelationDimensions } from "../mxStyles/diagramStyles";
import {
    buildDecoratorCellId,
    getInsetBounds,
    isDecoratorCellForSuffix,
    syncVertexDecoratorBounds,
} from "./decoratorRendering";

export const IDENTIFYING_RELATION_DECORATOR_SUFFIX = "__identifying_decorator";

export const IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX =
    "__identifying_weak_edge_decorator";

const IDENTIFYING_RELATION_DECORATOR_OFFSET = 4;
const IDENTIFYING_RELATION_EDGE_PARALLEL_GAP = 5;

const REPEATED_PARTICIPANT_EDGE_GAP = 55;

export const getIdentifyingRelationDecoratorId = (relationId) =>
    buildDecoratorCellId(relationId, IDENTIFYING_RELATION_DECORATOR_SUFFIX);

export const getIdentifyingRelationEdgeDecoratorId = (relationId) =>
    buildDecoratorCellId(
        relationId,
        IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX,
    );

export const isIdentifyingRelationDecoratorCell = (cell) =>
    isDecoratorCellForSuffix(cell, IDENTIFYING_RELATION_DECORATOR_SUFFIX);

export const isIdentifyingRelationEdgeDecoratorCell = (cell) =>
    isDecoratorCellForSuffix(cell, IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX);

const getIdentifyingRelationDecoratorBounds = (relationGeometry) =>
    getInsetBounds(relationGeometry, IDENTIFYING_RELATION_DECORATOR_OFFSET);

export const createRelationRenderingHelpers = ({
    graph,
    accessCell,
    mxPoint,
    mxGeometry,
    getWeakSideOfIdentifyingRelation,
}) => {
    const syncIdentifyingRelationDecorator = (relationCell) => {
        if (!relationCell) return;

        const decorator = accessCell(
            getIdentifyingRelationDecoratorId(relationCell.id),
        );

        const bounds = getIdentifyingRelationDecoratorBounds(
            relationCell.geometry,
        );

        syncVertexDecoratorBounds({
            graph,
            decoratorCell: decorator,
            bounds,
        });
    };

    const createIdentifyingRelationDecorator = (relation) => {
        const { width, height } = getRelationDimensions(relation.name);

        const bounds = getIdentifyingRelationDecoratorBounds({
            x: relation.position.x,
            y: relation.position.y,
            width,
            height,
        });

        if (!bounds) {
            return null;
        }

        return graph.insertVertex(
            null,
            getIdentifyingRelationDecoratorId(relation.idMx),
            "",
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
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
    const getParallelTerminalPointsFromMainEdge = (mainEdge) => {
        if (!mainEdge) return null;

        const source = graph.getModel().getTerminal(mainEdge, true);
        const target = graph.getModel().getTerminal(mainEdge, false);

        if (source) {
            graph.view.invalidate(source);
        }

        if (target) {
            graph.view.invalidate(target);
        }

        graph.view.invalidate(mainEdge);
        graph.view.validate();

        const state = graph.view.getState(mainEdge);
        const absolutePoints = state?.absolutePoints?.filter(Boolean);

        if (!absolutePoints || absolutePoints.length < 2) return null;

        const start = absolutePoints[0];
        const end = absolutePoints[absolutePoints.length - 1];

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy) || 1;

        const normalX = -dy / length;
        const normalY = dx / length;

        return {
            source: new mxPoint(
                start.x + normalX * IDENTIFYING_RELATION_EDGE_PARALLEL_GAP,
                start.y + normalY * IDENTIFYING_RELATION_EDGE_PARALLEL_GAP,
            ),
            target: new mxPoint(
                end.x + normalX * IDENTIFYING_RELATION_EDGE_PARALLEL_GAP,
                end.y + normalY * IDENTIFYING_RELATION_EDGE_PARALLEL_GAP,
            ),
        };
    };

    const createIdentifyingRelationEdgeDecorator = (
        relationCell,
        relationData,
    ) => {
        const weakSide = getWeakSideOfIdentifyingRelation(relationData);
        const mainEdge = accessCell(weakSide?.edgeId);

        if (!mainEdge) return null;

        const parallelPoints = getParallelTerminalPointsFromMainEdge(mainEdge);

        if (!parallelPoints) return null;

        const edge = graph.insertEdge(
            null,
            getIdentifyingRelationEdgeDecoratorId(relationData.idMx),
            null,
            null,
            null,
            [
                `strokeColor=${ER_STROKE}`,
                "strokeWidth=1",
                "endArrow=none",
                "dashed=0",
                "editable=0",
                "movable=0",
                "resizable=0",
                "rounded=0",
                "pointerEvents=0",
                "edgeStyle=none",
            ].join(";"),
        );

        if (!edge.geometry) {
            edge.geometry = new mxGeometry();
        }

        edge.geometry.relative = false;
        edge.geometry.points = null;
        edge.geometry.setTerminalPoint(parallelPoints.source, true);
        edge.geometry.setTerminalPoint(parallelPoints.target, false);

        graph.orderCells(true, [edge]);

        return edge;
    };

    const syncIdentifyingRelationEdgeDecorator = (
        relationCell,
        relationData,
    ) => {
        const edge = accessCell(
            getIdentifyingRelationEdgeDecoratorId(relationData.idMx),
        );

        const weakSide = getWeakSideOfIdentifyingRelation(relationData);
        const mainEdge = accessCell(weakSide?.edgeId);

        if (!edge || !mainEdge) return;

        const parallelPoints = getParallelTerminalPointsFromMainEdge(mainEdge);

        if (!parallelPoints) return;

        graph.getModel().beginUpdate();

        try {
            graph.getModel().setTerminal(edge, null, true);
            graph.getModel().setTerminal(edge, null, false);

            const geometry = edge.geometry
                ? edge.geometry.clone()
                : new mxGeometry();

            geometry.relative = false;
            geometry.points = null;
            geometry.setTerminalPoint(parallelPoints.source, true);
            geometry.setTerminalPoint(parallelPoints.target, false);

            graph.getModel().setGeometry(edge, geometry);
        } finally {
            graph.getModel().endUpdate();
        }

        graph.refresh(edge);
        graph.orderCells(true, [edge]);
    };

    const ensureIdentifyingRelationEdgeDecorator = (
        relationCell,
        relationData,
    ) => {
        const existingEdge = accessCell(
            getIdentifyingRelationEdgeDecoratorId(relationData.idMx),
        );

        if (existingEdge) {
            syncIdentifyingRelationEdgeDecorator(relationCell, relationData);
            return;
        }

        createIdentifyingRelationEdgeDecorator(relationCell, relationData);
        syncIdentifyingRelationEdgeDecorator(relationCell, relationData);
    };

    const removeIdentifyingRelationEdgeDecorator = (relationId) => {
        const edge = accessCell(
            getIdentifyingRelationEdgeDecoratorId(relationId),
        );

        if (edge) {
            graph.removeCells([edge]);
        }
    };

    const getCellCenter = (cell) => {
        if (!cell?.geometry) return null;

        return {
            x: cell.geometry.x + cell.geometry.width / 2,
            y: cell.geometry.y + cell.geometry.height / 2,
        };
    };

    const getRepeatedParticipantSideGroups = (relationData) => {
        const sideKeys = getRelationSideKeys(relationData);

        const sideGroupsByEntityId = sideKeys.reduce((result, sideKey) => {
            const entityId = relationData?.[sideKey]?.entity?.idMx ?? "";

            if (!entityId) {
                return result;
            }

            result[entityId] = [...(result[entityId] ?? []), sideKey];

            return result;
        }, {});

        return Object.values(sideGroupsByEntityId).filter(
            (sideGroup) => sideGroup.length > 1,
        );
    };

    const getRepeatedParticipantRoutePoints = ({
        relationCell,
        entityCell,
        index,
        sideGroupLength,
    }) => {
        const relationCenter = getCellCenter(relationCell);
        const entityCenter = getCellCenter(entityCell);

        if (!relationCenter || !entityCenter) return [];

        if (index === 0) {
            return [];
        }

        const relationTop = relationCell.geometry.y;
        const entityTop = entityCell.geometry.y;
        const relationBottom =
            relationCell.geometry.y + relationCell.geometry.height;
        const entityBottom = entityCell.geometry.y + entityCell.geometry.height;

        if (sideGroupLength === 2 || index === 1) {
            const routeY =
                Math.min(relationTop, entityTop) -
                REPEATED_PARTICIPANT_EDGE_GAP;

            return [
                new mxPoint(relationCenter.x, routeY),
                new mxPoint(entityCenter.x, routeY),
            ];
        }

        const routeY =
            Math.max(relationBottom, entityBottom) +
            REPEATED_PARTICIPANT_EDGE_GAP;

        return [
            new mxPoint(relationCenter.x, routeY),
            new mxPoint(entityCenter.x, routeY),
        ];
    };

    const syncRepeatedParticipantRelationEdges = (
        relationCell,
        relationData,
    ) => {
        if (!relationCell || !relationData) return;

        const repeatedSideGroups =
            getRepeatedParticipantSideGroups(relationData);

        if (repeatedSideGroups.length === 0) {
            return;
        }

        const updatedEdges = [];

        graph.getModel().beginUpdate();

        try {
            repeatedSideGroups.forEach((sideGroup) => {
                sideGroup.forEach((sideKey, index) => {
                    const side = relationData[sideKey];
                    const edge = accessCell(side?.edgeId);
                    const entityCell = accessCell(side?.entity?.idMx);

                    if (!edge || !entityCell) {
                        return;
                    }

                    const routePoints = getRepeatedParticipantRoutePoints({
                        relationCell,
                        entityCell,
                        index,
                        sideGroupLength: sideGroup.length,
                    });

                    const geometry = edge.geometry
                        ? edge.geometry.clone()
                        : new mxGeometry();

                    geometry.points = routePoints;

                    graph.getModel().setGeometry(edge, geometry);
                    updatedEdges.push(edge);
                });
            });
        } finally {
            graph.getModel().endUpdate();
        }

        updatedEdges.forEach((edge) => graph.refresh(edge));
    };

    const syncSelfRelationEdges = syncRepeatedParticipantRelationEdges;

    return {
        syncSelfRelationEdges,
        syncRepeatedParticipantRelationEdges,
        syncIdentifyingRelationDecorator,
        ensureIdentifyingRelationDecorator,
        removeIdentifyingRelationDecorator,
        syncIdentifyingRelationEdgeDecorator,
        ensureIdentifyingRelationEdgeDecorator,
        removeIdentifyingRelationEdgeDecorator,
    };
};
