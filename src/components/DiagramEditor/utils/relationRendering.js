import { ER_STROKE, getRelationDimensions } from "./mxStyles/diagramStyles";

export const IDENTIFYING_RELATION_DECORATOR_SUFFIX = "__identifying_decorator";

export const IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX =
    "__identifying_weak_edge_decorator";

const IDENTIFYING_RELATION_DECORATOR_OFFSET = 4;
const IDENTIFYING_RELATION_EDGE_PARALLEL_GAP = 5;

export const getIdentifyingRelationDecoratorId = (relationId) =>
    `${relationId}${IDENTIFYING_RELATION_DECORATOR_SUFFIX}`;

export const getIdentifyingRelationEdgeDecoratorId = (relationId) =>
    `${relationId}${IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX}`;

export const isIdentifyingRelationDecoratorCell = (cell) =>
    !!cell?.id &&
    String(cell.id).endsWith(IDENTIFYING_RELATION_DECORATOR_SUFFIX);

export const isIdentifyingRelationEdgeDecoratorCell = (cell) =>
    !!cell?.id &&
    String(cell.id).endsWith(IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX);

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

    return {
        syncIdentifyingRelationDecorator,
        ensureIdentifyingRelationDecorator,
        removeIdentifyingRelationDecorator,
        syncIdentifyingRelationEdgeDecorator,
        ensureIdentifyingRelationEdgeDecorator,
        removeIdentifyingRelationEdgeDecorator,
    };
};
