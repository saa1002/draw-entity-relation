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
    getAttributeDimensions,
} from "../mxStyles/diagramStyles";

import {
    buildDecoratorCellId,
    getInsetBounds,
    isDecoratorCellForSuffix,
    syncVertexDecoratorBounds,
} from "./decoratorRendering";

// Rendering helpers for E/R attributes. Composite attributes use connector cells,
// while leaf attributes use visible ellipses and optional decorators.

export const DISCRIMINANT_UNDERLINE_SUFFIX = "__discriminant_underline";
export const MULTIVALUED_ATTRIBUTE_DECORATOR_SUFFIX = "__multivalued_decorator";

const DISCRIMINANT_UNDERLINE_MARGIN_X = 16;
const DISCRIMINANT_UNDERLINE_OFFSET_Y = 12;
const MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET = 4;

const ATTRIBUTE_BASE_STYLE_PARTS = [
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
];

const VISIBLE_ATTRIBUTE_STYLE = [
    ...ATTRIBUTE_BASE_STYLE_PARTS,
    `fontColor=${ER_FONT}`,
    `fontSize=${ER_FONT_SIZE}`,
    `fontFamily=${ER_FONT_FAMILY}`,
].join(";");

// Composite attributes are not rendered as labeled ellipses themselves; their
// children carry the visible attribute labels.
const COMPOSITE_ATTRIBUTE_CONNECTOR_STYLE = [
    ...ATTRIBUTE_BASE_STYLE_PARTS,
    "fontSize=0",
    "fontColor=none",
].join(";");

export const COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE = 1;

export const isCompositeAttributeForRendering = (attribute) =>
    getAttributeChildren(attribute).length > 0;

export const getAttributeDisplayValue = (attribute) =>
    isCompositeAttributeForRendering(attribute) ? "" : attribute?.name;

export const getAttributeRenderDimensions = (attribute, getDimensions) => {
    if (isCompositeAttributeForRendering(attribute)) {
        return {
            width: COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE,
            height: COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE,
        };
    }

    return getDimensions(attribute?.name);
};

const getMultivaluedAttributeDecoratorBounds = (attributeGeometry) =>
    getInsetBounds(attributeGeometry, MULTIVALUED_ATTRIBUTE_DECORATOR_OFFSET);

export const getDiscriminantUnderlineId = (attributeId) =>
    buildDecoratorCellId(attributeId, DISCRIMINANT_UNDERLINE_SUFFIX);

export const getMultivaluedAttributeDecoratorId = (attributeId) =>
    buildDecoratorCellId(attributeId, MULTIVALUED_ATTRIBUTE_DECORATOR_SUFFIX);

export const isDiscriminantUnderlineCell = (cell) =>
    isDecoratorCellForSuffix(cell, DISCRIMINANT_UNDERLINE_SUFFIX);

export const isMultivaluedAttributeDecoratorCell = (cell) =>
    isDecoratorCellForSuffix(cell, MULTIVALUED_ATTRIBUTE_DECORATOR_SUFFIX);

export const getAttributeStyleString = (
    attribute,
    { inheritedKey = false } = {},
) => {
    if (isCompositeAttributeForRendering(attribute)) {
        return COMPOSITE_ATTRIBUTE_CONNECTOR_STYLE;
    }

    if (attribute?.key || inheritedKey) {
        return `${VISIBLE_ATTRIBUTE_STYLE};keyAttrStyle`;
    }

    return VISIBLE_ATTRIBUTE_STYLE;
};

// Factory bound to the current mxGraph instance. Returned helpers create, remove
// and resynchronize attribute cells and their decorators.
export const createAttributeRenderingHelpers = ({
    graph,
    accessCell,
    mxPoint,
    mxGeometry,
    updateAttributePosition,
    getAttributeDimensions: resolveAttributeDimensions = getAttributeDimensions,
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

    // An attribute may own multiple cells: the visible or connector vertex, its
    // connection edge and optional decorators.
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

    // Discriminant markers are implemented as independent edges so they can be
    // positioned under an attribute without changing the ellipse style.
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

    // The multivalued marker is a second ellipse inset inside the attribute cell.
    const syncMultivaluedAttributeDecorator = (attributeCell) => {
        if (!attributeCell?.id) return;

        const decorator = accessCell(
            getMultivaluedAttributeDecoratorId(attributeCell.id),
        );

        const bounds = getMultivaluedAttributeDecoratorBounds(
            attributeCell.geometry,
        );

        syncVertexDecoratorBounds({
            graph,
            decoratorCell: decorator,
            bounds,
            disablePointerEvents: true,
        });
    };

    const createMultivaluedAttributeDecorator = (attributeCell) => {
        if (!attributeCell?.id) return null;

        const bounds = getMultivaluedAttributeDecoratorBounds(
            attributeCell.geometry,
        );

        if (!bounds) {
            return null;
        }

        return graph.insertVertex(
            null,
            getMultivaluedAttributeDecoratorId(attributeCell.id),
            "",
            bounds.x,
            bounds.y,
            bounds.width,
            bounds.height,
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

    const removeAttributeConnectionEdges = (attribute) => {
        const edgeCells = (attribute?.cell ?? [])
            .slice(1)
            .map((cellId) => accessCell(cellId))
            .filter(Boolean);

        if (edgeCells.length > 0) {
            graph.removeCells(edgeCells);
        }

        return edgeCells;
    };

    // Recreates the edge from an attribute to its current owner after tree operations
    // such as converting subattributes back to root attributes.
    const reparentAttributeCellToCurrentOwner = ({
        attribute,
        attributeOwner,
    }) => {
        if (!attribute?.idMx || !attributeOwner) return null;

        const parentOwner = attributeOwner.parent ?? attributeOwner.owner;
        const attributeCell = accessCell(attribute.idMx);
        const sourceCell = accessCell(parentOwner?.idMx);

        if (!attributeCell || !sourceCell) return null;

        const edge = graph.insertEdge(
            sourceCell,
            null,
            null,
            sourceCell,
            attributeCell,
        );

        attribute.cell = [attributeCell.id, edge.id];

        updateAttributePosition?.({
            attribute,
            owner: parentOwner,
            position: attributeCell.geometry,
        });

        graph.orderCells(true, [edge]);
        syncAttributeVisualRepresentation(attribute);

        return edge;
    };

    // Refreshes the full visual state of an attribute subtree after semantic changes
    // such as key, partial-key or multivalued toggles.
    const syncAttributeVisualRepresentation = (
        attribute,
        {
            inheritedKey = false,
            inheritedPartialKey = false,
            inheritedMultivalued = false,
        } = {},
    ) => {
        const effectiveKey = inheritedKey || attribute?.key === true;
        const effectivePartialKey =
            inheritedPartialKey || attribute?.partialKey === true;
        const attributeCell = accessCell(attribute.idMx);
        const isCompositeAttribute =
            isCompositeAttributeForRendering(attribute);

        if (attributeCell) {
            const model = graph.getModel();

            model.beginUpdate();

            try {
                const displayValue = getAttributeDisplayValue(attribute);

                if (typeof model.setValue === "function") {
                    model.setValue(attributeCell, displayValue);
                } else {
                    attributeCell.value = displayValue;
                }

                if (attributeCell.geometry) {
                    const { width, height } = getAttributeRenderDimensions(
                        attribute,
                        resolveAttributeDimensions,
                    );

                    const geometry =
                        typeof attributeCell.geometry.clone === "function"
                            ? attributeCell.geometry.clone()
                            : { ...attributeCell.geometry };

                    geometry.x += (geometry.width - width) / 2;
                    geometry.y += (geometry.height - height) / 2;
                    geometry.width = width;
                    geometry.height = height;

                    if (typeof model.setGeometry === "function") {
                        model.setGeometry(attributeCell, geometry);
                    } else {
                        attributeCell.geometry = geometry;
                    }
                }

                const style = getAttributeStyleString(attribute, {
                    inheritedKey,
                });

                if (typeof model.setStyle === "function") {
                    model.setStyle(attributeCell, style);
                } else {
                    attributeCell.style = style;
                }
            } finally {
                model.endUpdate();
            }
            const shouldRenderMultivaluedDecorator =
                (isMultivaluedAttribute(attribute) || inheritedMultivalued) &&
                !isCompositeAttribute;

            if (shouldRenderMultivaluedDecorator) {
                ensureMultivaluedAttributeDecorator(attributeCell);
            } else {
                removeMultivaluedAttributeDecorator(attribute.idMx);
            }

            const shouldRenderDiscriminantUnderline =
                effectivePartialKey && !isCompositeAttribute;

            if (shouldRenderDiscriminantUnderline) {
                ensureDiscriminantUnderline(attributeCell);
            } else {
                removeDiscriminantUnderline(attribute.idMx);
            }

            graph.refresh(attributeCell);
        }

        const childAttributes = getAttributeChildren(attribute);
        const shouldPassMultivaluedDecoratorToChildren =
            (isMultivaluedAttribute(attribute) || inheritedMultivalued) &&
            isCompositeAttribute;

        childAttributes.forEach((childAttribute) => {
            syncAttributeVisualRepresentation(childAttribute, {
                inheritedKey: effectiveKey,
                inheritedPartialKey: effectivePartialKey,
                inheritedMultivalued: shouldPassMultivaluedDecoratorToChildren,
            });
        });
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

    // Child attributes are positioned from stored offsets relative to their current
    // parent cell.
    const syncAttributePositionFromParent = (
        attribute,
        parentCell,
        { inheritedPartialKey = false, inheritedMultivalued = false } = {},
    ) => {
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

        const isCompositeAttribute =
            isCompositeAttributeForRendering(attribute);
        const effectivePartialKey =
            inheritedPartialKey || attribute?.partialKey === true;
        const shouldSyncMultivaluedDecorator =
            (isMultivaluedAttribute(attribute) || inheritedMultivalued) &&
            !isCompositeAttribute;

        if (shouldSyncMultivaluedDecorator) {
            syncMultivaluedAttributeDecorator(attributeCell);
        }

        if (effectivePartialKey && !isCompositeAttribute) {
            syncDiscriminantUnderline(attributeCell);
        }

        const childAttributes = getAttributeChildren(attribute);
        const shouldPassMultivaluedDecoratorToChildren =
            (isMultivaluedAttribute(attribute) || inheritedMultivalued) &&
            isCompositeAttribute;

        childAttributes.forEach((childAttribute) => {
            syncAttributePositionFromParent(childAttribute, attributeCell, {
                inheritedPartialKey: effectivePartialKey,
                inheritedMultivalued: shouldPassMultivaluedDecoratorToChildren,
            });
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
        const childAttributes = getAttributeChildren(attribute);
        const shouldPassMultivaluedDecoratorToChildren =
            isMultivaluedAttribute(attribute) &&
            isCompositeAttributeForRendering(attribute);

        graph.getModel().beginUpdate();

        try {
            childAttributes.forEach((childAttribute) => {
                syncAttributePositionFromParent(childAttribute, attributeCell, {
                    inheritedPartialKey: attribute?.partialKey === true,
                    inheritedMultivalued:
                        shouldPassMultivaluedDecoratorToChildren,
                });
            });
        } finally {
            graph.getModel().endUpdate();
        }

        getAttributesCells(getAttributeChildren(attribute)).forEach((cell) => {
            graph.refresh(cell);
        });
    };

    // Creates both the attribute vertex and its owner edge. The returned ids are
    // stored in the domain model by the caller.
    const createAttributeGraphCells = ({
        name,
        source,
        offsetX,
        offsetY,
        semantics,
    }) => {
        if (!graph || !source?.geometry) return null;

        const newX = source.geometry.x + offsetX;
        const newY = source.geometry.y + offsetY;

        const attributeForRendering = {
            name,
            ...semantics,
        };

        const { width, height } = getAttributeRenderDimensions(
            attributeForRendering,
            resolveAttributeDimensions,
        );

        const target = graph.insertVertex(
            null,
            null,
            getAttributeDisplayValue(attributeForRendering),
            newX,
            newY,
            width,
            height,
            getAttributeStyleString(attributeForRendering),
        );

        const edge = graph.insertEdge(source, null, null, source, target);

        graph.orderCells(false);

        if (semantics.multivalued) {
            ensureMultivaluedAttributeDecorator(target);
        }

        if (semantics.partialKey) {
            ensureDiscriminantUnderline(target);
        }

        return { target, edge };
    };

    return {
        getAttributesCells,
        removeAttributesCells,
        removeAttributeConnectionEdges,
        reparentAttributeCellToCurrentOwner,
        syncOwnerAttributePositions,
        createAttributeGraphCells,
        syncDiscriminantUnderline,
        ensureDiscriminantUnderline,
        syncMultivaluedAttributeDecorator,
        ensureMultivaluedAttributeDecorator,
        syncAttributeVisualRepresentation,
        syncAttributeChildrenPositions,
        setOwnerAttributesVisible,
    };
};
