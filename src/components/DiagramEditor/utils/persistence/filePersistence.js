import { normalizeDiagramData } from "../../../../domain/er";

export const SAVE_FILE_RESULT = {
    SAVED: "saved",
    CANCELLED: "cancelled",
    UNSUPPORTED: "unsupported",
    ERROR: "error",
};

export const DIAGRAM_IMAGE_EXPORT_FORMATS = {
    PNG: "png",
    SVG: "svg",
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const IMAGE_EXPORT_PADDING = 24;
const IMAGE_EXPORT_BACKGROUND = "#ffffff";

const padDatePart = (value) => String(value).padStart(2, "0");

const getExportTimestamp = () => {
    const now = new Date();

    return [
        `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(
            now.getDate(),
        )}`,
        `${padDatePart(now.getHours())}-${padDatePart(now.getMinutes())}`,
    ].join("_");
};

const buildExportFileName = (baseName, extension) =>
    `${baseName}-${getExportTimestamp()}.${extension}`;

export const saveFileWithPicker = async ({
    content,
    fileName,
    mimeType,
    pickerTypes,
}) => {
    if (
        typeof window === "undefined" ||
        typeof window.showSaveFilePicker !== "function"
    ) {
        return SAVE_FILE_RESULT.UNSUPPORTED;
    }

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: pickerTypes,
        });

        const writable = await fileHandle.createWritable();
        const fileContent =
            typeof Blob !== "undefined" && content instanceof Blob
                ? content
                : new Blob([content], { type: mimeType });

        await writable.write(fileContent);
        await writable.close();

        return SAVE_FILE_RESULT.SAVED;
    } catch (error) {
        if (error?.name === "AbortError") {
            return SAVE_FILE_RESULT.CANCELLED;
        }

        return SAVE_FILE_RESULT.ERROR;
    }
};

export const exportSqlScriptToFile = (sqlScript) =>
    saveFileWithPicker({
        content: sqlScript,
        fileName: buildExportFileName("script-sql-er", "sql"),
        mimeType: "text/plain;charset=utf-8",
        pickerTypes: [
            {
                description: "SQL file",
                accept: {
                    "text/plain": [".sql"],
                },
            },
        ],
    });

export const exportDiagramToJsonFile = (diagram) => {
    const jsonString = JSON.stringify(normalizeDiagramData(diagram), null, 2);

    return saveFileWithPicker({
        content: jsonString,
        fileName: buildExportFileName("diagrama-er", "json"),
        mimeType: "application/json;charset=utf-8",
        pickerTypes: [
            {
                description: "JSON file",
                accept: {
                    "application/json": [".json"],
                },
            },
        ],
    });
};

const getDiagramImageExportBounds = (graph) => {
    const bounds = graph?.getGraphBounds?.();

    if (
        !bounds ||
        !Number.isFinite(bounds.x) ||
        !Number.isFinite(bounds.y) ||
        !Number.isFinite(bounds.width) ||
        !Number.isFinite(bounds.height) ||
        bounds.width <= 0 ||
        bounds.height <= 0
    ) {
        return null;
    }

    return {
        x: Math.floor(bounds.x - IMAGE_EXPORT_PADDING),
        y: Math.floor(bounds.y - IMAGE_EXPORT_PADDING),
        width: Math.ceil(bounds.width + IMAGE_EXPORT_PADDING * 2),
        height: Math.ceil(bounds.height + IMAGE_EXPORT_PADDING * 2),
    };
};

const createDiagramSvgExport = (graph) => {
    if (
        typeof document === "undefined" ||
        typeof XMLSerializer === "undefined"
    ) {
        return null;
    }

    const sourceSvg = graph?.container?.querySelector?.("svg");
    const bounds = getDiagramImageExportBounds(graph);

    if (!sourceSvg || !bounds) {
        return null;
    }

    const exportSvg = document.createElementNS(SVG_NAMESPACE, "svg");

    exportSvg.setAttribute("xmlns", SVG_NAMESPACE);
    exportSvg.setAttribute("xmlns:xlink", SVG_XLINK_NAMESPACE);
    exportSvg.setAttribute("width", String(bounds.width));
    exportSvg.setAttribute("height", String(bounds.height));
    exportSvg.setAttribute(
        "viewBox",
        `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`,
    );
    exportSvg.setAttribute("role", "img");

    const background = document.createElementNS(SVG_NAMESPACE, "rect");

    background.setAttribute("x", String(bounds.x));
    background.setAttribute("y", String(bounds.y));
    background.setAttribute("width", String(bounds.width));
    background.setAttribute("height", String(bounds.height));
    background.setAttribute("fill", IMAGE_EXPORT_BACKGROUND);

    exportSvg.appendChild(background);

    Array.from(sourceSvg.childNodes).forEach((childNode) => {
        exportSvg.appendChild(childNode.cloneNode(true));
    });

    const content = new XMLSerializer().serializeToString(exportSvg);

    return {
        content: `<?xml version="1.0" encoding="UTF-8"?>\n${content}`,
        width: bounds.width,
        height: bounds.height,
    };
};

const convertSvgExportToPngBlob = ({ content, width, height }) =>
    new Promise((resolve, reject) => {
        if (typeof document === "undefined") {
            reject(new Error("Document is not available."));
            return;
        }

        const image = new Image();
        const svgBlob = new Blob([content], {
            type: "image/svg+xml;charset=utf-8",
        });
        const objectUrl = URL.createObjectURL(svgBlob);

        image.onload = () => {
            const canvas = document.createElement("canvas");

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");

            if (!context) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Canvas context is not available."));
                return;
            }

            context.fillStyle = IMAGE_EXPORT_BACKGROUND;
            context.fillRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);

            canvas.toBlob((pngBlob) => {
                URL.revokeObjectURL(objectUrl);

                if (!pngBlob) {
                    reject(new Error("PNG export failed."));
                    return;
                }

                resolve(pngBlob);
            }, "image/png");
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("SVG image could not be loaded."));
        };

        image.src = objectUrl;
    });

export const exportDiagramToSvgImageFile = async (graph) => {
    const svgExport = createDiagramSvgExport(graph);

    if (!svgExport) {
        return SAVE_FILE_RESULT.ERROR;
    }

    return saveFileWithPicker({
        content: svgExport.content,
        fileName: buildExportFileName("diagrama-er", "svg"),
        mimeType: "image/svg+xml;charset=utf-8",
        pickerTypes: [
            {
                description: "SVG image",
                accept: {
                    "image/svg+xml": [".svg"],
                },
            },
        ],
    });
};

export const exportDiagramToPngImageFile = async (graph) => {
    const svgExport = createDiagramSvgExport(graph);

    if (!svgExport) {
        return SAVE_FILE_RESULT.ERROR;
    }

    try {
        const pngBlob = await convertSvgExportToPngBlob(svgExport);

        return saveFileWithPicker({
            content: pngBlob,
            fileName: buildExportFileName("diagrama-er", "png"),
            mimeType: "image/png",
            pickerTypes: [
                {
                    description: "PNG image",
                    accept: {
                        "image/png": [".png"],
                    },
                },
            ],
        });
    } catch (error) {
        return SAVE_FILE_RESULT.ERROR;
    }
};

export const exportDiagramImageToFile = (graph, format) => {
    if (format === DIAGRAM_IMAGE_EXPORT_FORMATS.SVG) {
        return exportDiagramToSvgImageFile(graph);
    }

    return exportDiagramToPngImageFile(graph);
};

export const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            resolve(event.target.result);
        };

        reader.onerror = () => {
            reject(reader.error);
        };

        reader.readAsText(file);
    });

export const readDiagramJsonFile = async (file) => {
    const fileContent = await readFileAsText(file);
    const rawDiagram = JSON.parse(fileContent);

    return normalizeDiagramData(rawDiagram);
};

export const saveDiagramToLocalStorage = (diagram) => {
    localStorage.setItem(
        "diagramData",
        JSON.stringify(normalizeDiagramData(diagram)),
    );
};

export const loadDiagramFromLocalStorage = () => {
    const savedDiagram = localStorage.getItem("diagramData");

    if (!savedDiagram) {
        return null;
    }

    try {
        return normalizeDiagramData(JSON.parse(savedDiagram));
    } catch (error) {
        clearDiagramLocalStorage();
        return null;
    }
};

export const clearDiagramLocalStorage = () => {
    localStorage.removeItem("diagramData");
};
