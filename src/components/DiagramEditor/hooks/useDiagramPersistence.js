import {
    composeDiagramData,
    updateAttributePosition,
} from "../../../domain/er";
import { clearGraphCanvas } from "../utils/graph/graphCanvas";
import {
    clearDiagramLocalStorage,
    loadDiagramFromLocalStorage,
    saveDiagramToLocalStorage,
} from "../utils/persistence/filePersistence";
import { syncDiagramDataFromGraph } from "../utils/sync/diagramGraphSync";
import { reconstructDiagramGraph } from "../utils/sync/diagramReconstruction";

export function useDiagramPersistence({
    graph,
    diagramRef,
    accessCell,
    mxPoint,
    updateEmptyCanvasState,
    createWeakEntityDecorator,
    ensureDiscriminantUnderline,
    ensureMultivaluedAttributeDecorator,
    ensureIdentifyingRelationDecorator,
    ensureIdentifyingRelationEdgeDecorator,
    syncRepeatedParticipantRelationEdges,
    clearEditorSelection,
}) {
    const saveToLocalStorage = () => {
        saveDiagramToLocalStorage(diagramRef.current);
    };

    const recreateGraphFromDiagram = (diagramData) => {
        if (!diagramData) return false;

        diagramRef.current = diagramData;
        updateEmptyCanvasState(diagramRef.current);

        if (!graph) return true;

        reconstructDiagramGraph({
            graph,
            diagram: diagramRef.current,
            accessCell,
            mxPoint,
            createWeakEntityDecorator,
            ensureDiscriminantUnderline,
            ensureMultivaluedAttributeDecorator,
            ensureIdentifyingRelationDecorator,
            ensureIdentifyingRelationEdgeDecorator,
            syncRepeatedParticipantRelationEdges,
        });

        return true;
    };

    const composeDiagramWithCurrent = ({ incomingDiagram, mode }) =>
        composeDiagramData({
            currentDiagram: diagramRef.current,
            importedDiagram: incomingDiagram,
            mode,
        });

    const applyDiagramData = (diagramData) => {
        if (graph) {
            clearGraphCanvas(graph);
        }

        const diagramApplied = recreateGraphFromDiagram(diagramData);

        if (!diagramApplied) return false;

        clearEditorSelection();
        saveToLocalStorage();

        return true;
    };

    const recreateGraphFromLocalStorage = () => {
        const savedData = loadDiagramFromLocalStorage();

        return recreateGraphFromDiagram(savedData);
    };

    const syncAndPersistDiagramData = () => {
        if (!graph) return false;

        syncDiagramDataFromGraph({
            diagram: diagramRef.current,
            graph,
            accessCell,
            updateAttributePosition,
        });

        saveToLocalStorage();
        updateEmptyCanvasState();

        return true;
    };

    const applyHistoryDiagramData = (diagramData) =>
        applyDiagramData(diagramData);

    const resetCanvas = ({ persist = false } = {}) => {
        diagramRef.current = {
            entities: [],
            relations: [],
            isas: [],
        };

        clearDiagramLocalStorage();

        if (graph) {
            clearGraphCanvas(graph);
        }

        updateEmptyCanvasState();
        clearEditorSelection();

        if (persist) {
            saveToLocalStorage();
        }

        return true;
    };

    return {
        saveToLocalStorage,
        recreateGraphFromDiagram,
        composeDiagramWithCurrent,
        applyDiagramData,
        recreateGraphFromLocalStorage,
        syncAndPersistDiagramData,
        applyHistoryDiagramData,
        resetCanvas,
    };
}
