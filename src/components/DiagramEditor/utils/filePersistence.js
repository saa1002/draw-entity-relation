import { normalizeDiagramData } from "../../../domain/er";

export const SAVE_FILE_RESULT = {
    SAVED: "saved",
    CANCELLED: "cancelled",
    UNSUPPORTED: "unsupported",
    ERROR: "error",
};

export const saveFileWithPicker = async ({
    content,
    fileName,
    mimeType,
    pickerTypes,
}) => {
    if (!window.showSaveFilePicker || !window.showSaveFilePicker) {
        return SAVE_FILE_RESULT.UNSUPPORTED;
    }

    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: pickerTypes,
        });

        const writable = await fileHandle.createWritable();
        await writable.write(new Blob([content], { type: mimeType }));
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
        fileName: "tables.sql",
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
        fileName: "diagram.json",
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
