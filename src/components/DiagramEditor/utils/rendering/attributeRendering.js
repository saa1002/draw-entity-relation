import {
    flattenAttributeTree,
    getAttributeChildren,
} from "../../../../domain/er";

import {
    ER_FILL,
    ER_FONT,
    ER_FONT_FAMILY,
    ER_FONT_SIZE,
    ER_STROKE,
} from "../mxStyles/diagramStyles";

export const DISCRIMINANT_UNDERLINE_SUFFIX = "__discriminant_underline";

const DISCRIMINANT_UNDERLINE_MARGIN_X = 16;
const DISCRIMINANT_UNDERLINE_OFFSET_Y = 12;

export const getDiscriminantUnderlineId = (attributeId) =>
    `${attributeId}${DISCRIMINANT_UNDERLINE_SUFFIX}`;

export const isDiscriminantUnderlineCell = (cell) =>
    !!cell?.id && String(cell.id).endsWith(DISCRIMINANT_UNDERLINE_SUFFIX);

export const getAttributeStyleString = (attribute) => {
    const baseStyle = [
        "shape=ellipse",
        "perimeter=ellipsePerimeter",
        "align=center",
        "verticalAlign=middle",
        "spacing=0",
        "whiteSpace=wrap",
        "overflow=hidden",
        "resizable=0",
        `fillColor=${ER_FILL}`,
        `strokeColor=${ER_STROKE}`,
        "strokeWidth=1",
        `fontColor=${ER_FONT}`,
        `fontSize=${ER_FONT_SIZE}`,
        `fontFamily=${ER_FONT_FAMILY}`,
    ].join(";");

    if (attribute?.key) {
        return `${baseStyle};keyAttrStyle`;
    }

    return baseStyle;
};

export const createAttributeRenderingHelpers = ({
    graph,
    accessCell,
    mxPoint,
    mxGeometry,
}) => {
    const getAttributeCells = (attribute) => {
        if (!attribute) return [];

        const attributeCells = (attribute.cell ?? [])
            .map((cellId) => accessCell(cellId))
            .filter(Boolean);

        const underlineCell = attribute.idMx
            ? accessCell(getDiscriminantUnderlineId(attribute.idMx))
            : null;

        return [...attributeCells, underlineCell].filter(Boolean);
    };

    const getAttributesCells = (attributes = []) =>
        flattenAttributeTree(attributes).flatMap(getAttributeCells);

    const removeAttributesCells = (attributes = []) => {
        const cells = getAttributesCells(attributes);

        if (cells.length > 0) {
            graph.removeCells(cells);
        }

        return cells;
    };

    const getDiscriminantUnderlinePoints = (attributeCell) => {
        if (!attributeCell?.geometry) return null;

        const { x, y, width, height } = attributeCell.geometry;

        const startX = x + DISCRIMINANT_UNDERLINE_MARGIN_X;
        const endX =
            x +
            Math.max(
                DISCRIMINANT_UNDERLINE_MARGIN_X + 1,
                width - DISCRIMINANT_UNDERLINE_MARGIN_X,
            );

        const underlineY = y + height / 2 + DISCRIMINANT_UNDERLINE_OFFSET_Y;

        return {
            source: new mxPoint(startX, underlineY),
            target: new mxPoint(endX, underlineY),
        };
    };

    const createDiscriminantUnderline = (attributeCell) => {
        const points = getDiscriminantUnderlinePoints(attributeCell);
        if (!points) return null;

        const edge = graph.insertEdge(
            null,
            getDiscriminantUnderlineId(attributeCell.id),
            null,
            null,
            null,
            [
                `strokeColor=${ER_FONT}`,
                "strokeWidth=2",
                "endArrow=none",
                "dashed=1",
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
        edge.geometry.setTerminalPoint(points.source, true);
        edge.geometry.setTerminalPoint(points.target, false);

        graph.orderCells(false, [edge]);

        return edge;
    };

    const syncDiscriminantUnderline = (attributeCell) => {
        if (!attributeCell?.id) return;

        const underline = accessCell(
            getDiscriminantUnderlineId(attributeCell.id),
        );

        if (!underline) return;

        const points = getDiscriminantUnderlinePoints(attributeCell);
        if (!points) return;

        graph.getModel().beginUpdate();

        try {
            graph.getModel().setTerminal(underline, null, true);
            graph.getModel().setTerminal(underline, null, false);

            if (!underline.geometry) {
                underline.geometry = new mxGeometry();
            }

            underline.geometry.relative = false;
            underline.geometry.points = null;
            underline.geometry.setTerminalPoint(points.source, true);
            underline.geometry.setTerminalPoint(points.target, false);
        } finally {
            graph.getModel().endUpdate();
        }

        graph.refresh(underline);
        graph.orderCells(false, [underline]);
    };

    const ensureDiscriminantUnderline = (attributeCell) => {
        if (!attributeCell?.id) return;

        const existingUnderline = accessCell(
            getDiscriminantUnderlineId(attributeCell.id),
        );

        if (existingUnderline) {
            syncDiscriminantUnderline(attributeCell);
            return;
        }

        createDiscriminantUnderline(attributeCell);
        syncDiscriminantUnderline(attributeCell);
    };

    const removeDiscriminantUnderline = (attributeId) => {
        const underline = accessCell(getDiscriminantUnderlineId(attributeId));

        if (underline) {
            graph.removeCells([underline]);
        }
    };

    const syncAttributeVisualRepresentation = (attribute) => {
        const attributeCell = accessCell(attribute.idMx);

        if (!attributeCell) return;

        graph
            .getModel()
            .setStyle(attributeCell, getAttributeStyleString(attribute));

        if (attribute.partialKey) {
            ensureDiscriminantUnderline(attributeCell);
        } else {
            removeDiscriminantUnderline(attribute.idMx);
        }
    };

    const setOwnerAttributesVisible = (owner, visible) => {
        if (!owner?.attributes) return;

        graph.getModel().beginUpdate();

        try {
            getAttributesCells(owner.attributes).forEach((cell) => {
                cell.setVisible(visible);
            });
        } finally {
            graph.getModel().endUpdate();
        }
    };

    const syncAttributePositionFromParent = (attribute, parentCell) => {
        const attributeCell = accessCell(
            attribute.cell?.at(0) ?? attribute.idMx,
        );

        if (!attributeCell?.geometry || !parentCell?.geometry) return;

        const offsetX =
            typeof attribute.offsetX === "number" ? attribute.offsetX : 0;
        const offsetY =
            typeof attribute.offsetY === "number" ? attribute.offsetY : 0;

        attributeCell.geometry.x = parentCell.geometry.x + offsetX;
        attributeCell.geometry.y = parentCell.geometry.y + offsetY;

        if (attribute.partialKey) {
            syncDiscriminantUnderline(attributeCell);
        }

        getAttributeChildren(attribute).forEach((childAttribute) => {
            syncAttributePositionFromParent(childAttribute, attributeCell);
        });
    };

    const syncOwnerAttributePositions = (owner, ownerCell) => {
        if (!owner?.attributes || !ownerCell?.geometry) return;

        owner.attributes.forEach((attribute) => {
            syncAttributePositionFromParent(attribute, ownerCell);
        });
    };

    return {
        getAttributesCells,
        removeAttributesCells,
        syncOwnerAttributePositions,
        syncDiscriminantUnderline,
        ensureDiscriminantUnderline,
        syncAttributeVisualRepresentation,
        setOwnerAttributesVisible,
    };
};
