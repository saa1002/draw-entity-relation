import {
    flattenAttributeTree,
    getAttributeChildren,
    isMultivaluedAttribute,
} from "../../../../domain/er";

import {
    ER_FILL,
    ER_FONT,
    ER_FONT_FAMILY,
    ER_FONT_SIZE,
    ER_STROKE,
} from "../mxStyles/diagramStyles";

export const DISCRIMINANT_UNDERLINE_SUFFIX = "__discriminant_underline";
export const MULTIVALUED_ATTRIBUTE_DECORATOR_SUFFIX = "__multivalued_decorator";

const DISCRIMINANT_UNDERLINE_MARGIN_X = 16;
const DISCRIMINANT_UNDERLINE_OFFSET_Y = 12;
const MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET = 4;

export const getDiscriminantUnderlineId = (attributeId) =>
    `${attributeId}${DISCRIMINANT_UNDERLINE_SUFFIX}`;

export const getMultivaluedAttributeDecoratorId = (attributeId) =>
    `${attributeId}${MULTIVALUED_ATTRIBUTE_DECORATOR_SUFFIX}`;

export const isDiscriminantUnderlineCell = (cell) =>
    !!cell?.id && String(cell.id).endsWith(DISCRIMINANT_UNDERLINE_SUFFIX);

export const isMultivaluedAttributeDecoratorCell = (cell) =>
    !!cell?.id &&
    String(cell.id).endsWith(MULTIVALUED_ATTRIBUTE_DECORATOR_SUFFIX);

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

        const decoratorCell = attribute.idMx
            ? accessCell(getMultivaluedAttributeDecoratorId(attribute.idMx))
            : null;

        const underlineCell = attribute.idMx
            ? accessCell(getDiscriminantUnderlineId(attribute.idMx))
            : null;

        return [...attributeCells, decoratorCell, underlineCell].filter(
            Boolean,
        );
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

    const disablePointerEventsForCell = (cell) => {
        const state = graph.view?.getState?.(cell);

        const nodes = [state?.shape?.node, state?.text?.node].filter(Boolean);

        nodes.forEach((node) => {
            node.setAttribute("pointer-events", "none");
            node.style.pointerEvents = "none";

            node.querySelectorAll?.("*").forEach((childNode) => {
                childNode.setAttribute("pointer-events", "none");
                childNode.style.pointerEvents = "none";
            });
        });
    };

    const syncMultivaluedAttributeDecorator = (attributeCell) => {
        if (!attributeCell?.id) return;

        const decorator = accessCell(
            getMultivaluedAttributeDecoratorId(attributeCell.id),
        );

        if (!decorator || !decorator.geometry || !attributeCell.geometry) {
            return;
        }

        decorator.geometry.x =
            attributeCell.geometry.x + MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET;
        decorator.geometry.y =
            attributeCell.geometry.y + MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET;
        decorator.geometry.width = Math.max(
            1,
            attributeCell.geometry.width -
                MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET * 2,
        );
        decorator.geometry.height = Math.max(
            1,
            attributeCell.geometry.height -
                MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET * 2,
        );

        graph.refresh(decorator);
        graph.orderCells(false, [decorator]);
        disablePointerEventsForCell(decorator);
    };

    const createMultivaluedAttributeDecorator = (attributeCell) => {
        if (!attributeCell?.id || !attributeCell.geometry) return null;

        const { x, y, width, height } = attributeCell.geometry;

        return graph.insertVertex(
            null,
            getMultivaluedAttributeDecoratorId(attributeCell.id),
            "",
            x + MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET,
            y + MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET,
            Math.max(1, width - MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET * 2),
            Math.max(1, height - MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET * 2),
            "multivaluedAttributeDecoratorStyle;shape=ellipse;perimeter=ellipsePerimeter;pointerEvents=0",
        );
    };

    const ensureMultivaluedAttributeDecorator = (attributeCell) => {
        if (!attributeCell?.id) return;

        const existingDecorator = accessCell(
            getMultivaluedAttributeDecoratorId(attributeCell.id),
        );

        if (existingDecorator) {
            syncMultivaluedAttributeDecorator(attributeCell);
            return;
        }

        createMultivaluedAttributeDecorator(attributeCell);
        syncMultivaluedAttributeDecorator(attributeCell);
    };

    const removeMultivaluedAttributeDecorator = (attributeId) => {
        const decorator = accessCell(
            getMultivaluedAttributeDecoratorId(attributeId),
        );

        if (decorator) {
            graph.removeCells([decorator]);
        }
    };

    const syncAttributeVisualRepresentation = (attribute) => {
        const attributeCell = accessCell(attribute.idMx);

        if (!attributeCell) return;

        graph
            .getModel()
            .setStyle(attributeCell, getAttributeStyleString(attribute));

        if (isMultivaluedAttribute(attribute)) {
            ensureMultivaluedAttributeDecorator(attributeCell);
        } else {
            removeMultivaluedAttributeDecorator(attribute.idMx);
        }

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

        if (isMultivaluedAttribute(attribute)) {
            syncMultivaluedAttributeDecorator(attributeCell);
        }

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

    const syncAttributeChildrenPositions = (attribute, attributeCell) => {
        if (!attributeCell?.geometry) return;

        graph.getModel().beginUpdate();

        try {
            getAttributeChildren(attribute).forEach((childAttribute) => {
                syncAttributePositionFromParent(childAttribute, attributeCell);
            });
        } finally {
            graph.getModel().endUpdate();
        }

        getAttributesCells(getAttributeChildren(attribute)).forEach((cell) => {
            graph.refresh(cell);
        });
    };

    return {
        getAttributesCells,
        removeAttributesCells,
        syncOwnerAttributePositions,
        syncDiscriminantUnderline,
        ensureDiscriminantUnderline,
        syncMultivaluedAttributeDecorator,
        ensureMultivaluedAttributeDecorator,
        syncAttributeVisualRepresentation,
        syncAttributeChildrenPositions,
        setOwnerAttributesVisible,
    };
};
