    export const ENTITY_WIDTH = 120;
    export const ENTITY_HEIGHT = 42;

    export const RELATION_WIDTH = 90;
    export const RELATION_HEIGHT = 46;

    export const ATTRIBUTE_MIN_WIDTH = 70;
    export const ATTRIBUTE_HEIGHT = 34;
    export const ATTRIBUTE_HORIZONTAL_PADDING = 24;
    export const ATTRIBUTE_CHAR_WIDTH = 7;

    export const ER_STROKE = "#6b6b6b";
    export const ER_FILL = "#ffffff";
    export const ER_FONT = "#000000";
    export const ER_FONT_FAMILY = "Times New Roman";
    export const ER_FONT_SIZE = 16;

    export const getAttributeDimensions = (label = "") => {
        const text = String(label ?? "");
        return {
            width: Math.max(
                ATTRIBUTE_MIN_WIDTH,
                text.length * ATTRIBUTE_CHAR_WIDTH + ATTRIBUTE_HORIZONTAL_PADDING,
            ),
            height: ATTRIBUTE_HEIGHT,
        };
    
    };
    
    export const getEntityStyleString = () =>
        [
            "shape=rectangle",
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

    export const getRelationStyleString = (relation) => {
        const baseStyle = [
            "shape=rhombus",
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

        return relation?.isIdentifying
            ? `${baseStyle};dashed=1;strokeWidth=2`
            : baseStyle;
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