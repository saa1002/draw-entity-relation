// Centralized mxGraph dimensions and style strings for the E/R notation used by
// the editor.

const ENTITY_WIDTH = 120;
const ENTITY_HEIGHT = 42;

const RELATION_WIDTH = 90;
const RELATION_HEIGHT = 46;

const ATTRIBUTE_WIDTH = 70;
const ATTRIBUTE_HEIGHT = 34;

const ISA_WIDTH = 70;
const ISA_HEIGHT = 55;

const ENTITY_HORIZONTAL_PADDING = 28;
const RELATION_HORIZONTAL_PADDING = 24;
const ATTRIBUTE_HORIZONTAL_PADDING = 24;

const NODE_CHAR_WIDTH = 8;
const ATTRIBUTE_CHAR_WIDTH = 7;

export const ER_STROKE = "#6b6b6b";
export const ER_FILL = "#ffffff";
export const ER_FONT = "#000000";
export const ER_FONT_FAMILY = "Times New Roman";
export const ER_FONT_SIZE = 16;

// Cell type detection currently relies on mxGraph style strings, so style changes
// must preserve these shape markers.
const hasCellShape = (cell, shape) =>
    String(cell?.style ?? "").includes(`shape=${shape}`);

export const isEntityShapeCell = (cell) => hasCellShape(cell, "rectangle");

export const isRelationShapeCell = (cell) => hasCellShape(cell, "rhombus");

export const isIsaShapeCell = (cell) => hasCellShape(cell, "triangle");

export const isAttributeShapeCell = (cell) => hasCellShape(cell, "ellipse");

export const getEntityDimensions = (label = "") => {
    const text = String(label ?? "");
    return {
        width: Math.max(
            ENTITY_WIDTH,
            text.length * NODE_CHAR_WIDTH + ENTITY_HORIZONTAL_PADDING,
        ),
        height: ENTITY_HEIGHT,
    };
};

export const getRelationDimensions = (label = "") => {
    const text = String(label ?? "");
    return {
        width: Math.max(
            RELATION_WIDTH,
            text.length * NODE_CHAR_WIDTH + RELATION_HORIZONTAL_PADDING,
        ),
        height: RELATION_HEIGHT,
    };
};

export const getIsaDimensions = () => ({
    width: ISA_WIDTH,
    height: ISA_HEIGHT,
});

export const getAttributeDimensions = (label = "") => {
    const text = String(label ?? "");
    return {
        width: Math.max(
            ATTRIBUTE_WIDTH,
            text.length * ATTRIBUTE_CHAR_WIDTH + ATTRIBUTE_HORIZONTAL_PADDING,
        ),
        height: ATTRIBUTE_HEIGHT,
    };
};

export const getEntityStyleString = () =>
    [
        "shape=rectangle",
        "perimeter=rhombusPerimeter",
        "perimeterSpacing=0",
        "sourcePerimeterSpacing=0",
        "targetPerimeterSpacing=0",
        "rounded=0",
        `fillColor=${ER_FILL}`,
        `strokeColor=${ER_STROKE}`,
        "strokeWidth=1",
        "align=center",
        "verticalAlign=middle",
        `fontColor=${ER_FONT}`,
        `fontFamily=${ER_FONT_FAMILY}`,
        `fontSize=${ER_FONT_SIZE}`,
        "spacing=0",
        "whiteSpace=wrap",
        "overflow=hidden",
    ].join(";");

export const getRelationStyleString = () => {
    const baseStyle = [
        "shape=rhombus",
        "perimeter=rhombusPerimeter",
        "perimeterSpacing=0",
        "sourcePerimeterSpacing=0",
        "targetPerimeterSpacing=0",
        `fillColor=${ER_FILL}`,
        `strokeColor=${ER_STROKE}`,
        "strokeWidth=1",
        "align=center",
        "verticalAlign=middle",
        `fontColor=${ER_FONT}`,
        `fontFamily=${ER_FONT_FAMILY}`,
        `fontSize=${ER_FONT_SIZE}`,
        "spacing=0",
        "whiteSpace=wrap",
        "overflow=hidden",
    ].join(";");

    return baseStyle;
};

export const getCardinalityStyleString = () =>
    [
        "fontSize=16",
        `fontColor=${ER_FONT}`,
        `fontFamily=${ER_FONT_FAMILY}`,
        "fillColor=none",
        "strokeColor=none",
        "rounded=0",
        "spacing=0",
    ].join(";");

export const getIsaStyleString = () =>
    [
        "shape=triangle",
        "direction=south",
        "perimeter=trianglePerimeter",
        "perimeterSpacing=0",
        "sourcePerimeterSpacing=0",
        "targetPerimeterSpacing=0",
        `fillColor=${ER_FILL}`,
        `strokeColor=${ER_STROKE}`,
        "strokeWidth=1",
        "align=center",
        "verticalAlign=middle",
        `fontColor=${ER_FONT}`,
        `fontFamily=${ER_FONT_FAMILY}`,
        `fontSize=${ER_FONT_SIZE}`,
        "spacing=0",
        "spacingTop=-14",
        "whiteSpace=wrap",
        "overflow=hidden",
        "editable=0",
    ].join(";");

export const getIsaEdgeStyleString = () =>
    [
        `strokeColor=${ER_STROKE}`,
        "strokeWidth=1",
        "endArrow=none",
        "startArrow=none",
        "rounded=0",
        "html=1",
        "editable=0",
        "movable=0",
        "resizable=0",
    ].join(";");

// Registers named mxGraph styles used by rendering helpers for keys and decorators.
export const installDiagramEditorStyles = ({ graph, mxConstants }) => {
    if (!graph || !mxConstants) return;

    const keyAttrStyle = {};
    keyAttrStyle[mxConstants.STYLE_FONTSTYLE] = mxConstants.FONT_UNDERLINE;

    const notResizeableStyle = {};
    notResizeableStyle[mxConstants.STYLE_RESIZABLE] = 0;

    const weakEntityDecoratorStyle = {};
    weakEntityDecoratorStyle[mxConstants.STYLE_FILLCOLOR] = "none";
    weakEntityDecoratorStyle[mxConstants.STYLE_STROKECOLOR] = ER_STROKE;
    weakEntityDecoratorStyle[mxConstants.STYLE_STROKEWIDTH] = 2;
    weakEntityDecoratorStyle[mxConstants.STYLE_MOVABLE] = 0;
    weakEntityDecoratorStyle[mxConstants.STYLE_RESIZABLE] = 0;
    weakEntityDecoratorStyle[mxConstants.STYLE_EDITABLE] = 0;
    weakEntityDecoratorStyle[mxConstants.STYLE_ROTABLE] = 0;
    weakEntityDecoratorStyle[mxConstants.STYLE_POINTER_EVENTS] = 0;

    const multivaluedAttributeDecoratorStyle = {};
    multivaluedAttributeDecoratorStyle[mxConstants.STYLE_FILLCOLOR] = "none";
    multivaluedAttributeDecoratorStyle[mxConstants.STYLE_STROKECOLOR] =
        ER_STROKE;
    multivaluedAttributeDecoratorStyle[mxConstants.STYLE_STROKEWIDTH] = 1;
    multivaluedAttributeDecoratorStyle[mxConstants.STYLE_MOVABLE] = 0;
    multivaluedAttributeDecoratorStyle[mxConstants.STYLE_RESIZABLE] = 0;
    multivaluedAttributeDecoratorStyle[mxConstants.STYLE_EDITABLE] = 0;
    multivaluedAttributeDecoratorStyle[mxConstants.STYLE_ROTABLE] = 0;
    multivaluedAttributeDecoratorStyle[mxConstants.STYLE_POINTER_EVENTS] = 0;

    const identifyingRelationDecoratorStyle = {};
    identifyingRelationDecoratorStyle[mxConstants.STYLE_FILLCOLOR] = "none";
    identifyingRelationDecoratorStyle[mxConstants.STYLE_STROKECOLOR] =
        ER_STROKE;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_STROKEWIDTH] = 2;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_MOVABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_RESIZABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_EDITABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_ROTABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_POINTER_EVENTS] = 0;

    const defaultEdgeStyle = graph.getStylesheet().getDefaultEdgeStyle();
    defaultEdgeStyle[mxConstants.STYLE_ENDARROW] = "";
    defaultEdgeStyle[mxConstants.STYLE_STROKECOLOR] = ER_STROKE;
    defaultEdgeStyle[mxConstants.STYLE_FONTCOLOR] = ER_FONT;
    defaultEdgeStyle[mxConstants.STYLE_PERIMETER_SPACING] = 0;
    defaultEdgeStyle[mxConstants.STYLE_SOURCE_PERIMETER_SPACING] = 0;
    defaultEdgeStyle[mxConstants.STYLE_TARGET_PERIMETER_SPACING] = 0;

    graph.getStylesheet().putCellStyle("keyAttrStyle", keyAttrStyle);
    graph
        .getStylesheet()
        .putCellStyle("weakEntityDecoratorStyle", weakEntityDecoratorStyle);
    graph
        .getStylesheet()
        .putCellStyle(
            "multivaluedAttributeDecoratorStyle",
            multivaluedAttributeDecoratorStyle,
        );
    graph
        .getStylesheet()
        .putCellStyle(
            "identifyingRelationDecoratorStyle",
            identifyingRelationDecoratorStyle,
        );
    graph
        .getStylesheet()
        .putCellStyle("notResizeableStyle", notResizeableStyle);
};
