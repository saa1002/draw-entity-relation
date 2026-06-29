import * as React from "react";
import { normalizeDiagramData } from "../../../domain/er";

// Undo/redo history for diagram data. Snapshots are serialized JSON strings so
// changes can be compared cheaply and restored without keeping object references.

const DEFAULT_HISTORY_LIMIT = 100;

const createDiagramSnapshot = (diagram) =>
    JSON.stringify(normalizeDiagramData(diagram));

const readDiagramSnapshot = (snapshot) =>
    normalizeDiagramData(JSON.parse(snapshot));

export function useDiagramHistory({
    diagramRef,
    canApplySnapshot,
    applyDiagramSnapshotData,
    historyLimit = DEFAULT_HISTORY_LIMIT,
}) {
    const undoStackRef = React.useRef([]);
    const redoStackRef = React.useRef([]);
    const lastHistorySnapshotRef = React.useRef(null);
    const isApplyingHistorySnapshotRef = React.useRef(false);

    const [canUndo, setCanUndo] = React.useState(false);
    const [canRedo, setCanRedo] = React.useState(false);

    const updateHistoryAvailability = React.useCallback(() => {
        setCanUndo(undoStackRef.current.length > 1);
        setCanRedo(redoStackRef.current.length > 0);
    }, []);

    const resetDiagramHistory = React.useCallback(() => {
        const currentSnapshot = createDiagramSnapshot(diagramRef.current);

        undoStackRef.current = [currentSnapshot];
        redoStackRef.current = [];
        lastHistorySnapshotRef.current = currentSnapshot;

        updateHistoryAvailability();
    }, [diagramRef, updateHistoryAvailability]);

    // Recording is skipped while a snapshot is being applied to avoid creating a new
    // history entry from undo/redo itself.
    const recordCurrentDiagramInHistory = React.useCallback(() => {
        if (isApplyingHistorySnapshotRef.current) {
            return;
        }

        const currentSnapshot = createDiagramSnapshot(diagramRef.current);

        if (currentSnapshot === lastHistorySnapshotRef.current) {
            return;
        }

        if (!lastHistorySnapshotRef.current) {
            undoStackRef.current = [currentSnapshot];
        } else {
            undoStackRef.current.push(currentSnapshot);
        }

        if (undoStackRef.current.length > historyLimit) {
            undoStackRef.current.shift();
        }

        redoStackRef.current = [];
        lastHistorySnapshotRef.current = currentSnapshot;

        updateHistoryAvailability();
    }, [diagramRef, historyLimit, updateHistoryAvailability]);

    // Applying a snapshot delegates graph reconstruction to the persistence layer.
    const applyDiagramSnapshot = React.useCallback(
        (snapshot) => {
            if (!snapshot || !canApplySnapshot()) {
                return;
            }

            isApplyingHistorySnapshotRef.current = true;

            try {
                const diagramData = readDiagramSnapshot(snapshot);

                applyDiagramSnapshotData(diagramData);
                lastHistorySnapshotRef.current = snapshot;
            } finally {
                isApplyingHistorySnapshotRef.current = false;
            }
        },
        [canApplySnapshot, applyDiagramSnapshotData],
    );

    const undoDiagramChange = React.useCallback(() => {
        if (undoStackRef.current.length <= 1) {
            return false;
        }

        const currentSnapshot = undoStackRef.current.pop();
        redoStackRef.current.push(currentSnapshot);

        const previousSnapshot = undoStackRef.current.at(-1);

        applyDiagramSnapshot(previousSnapshot);
        updateHistoryAvailability();

        return true;
    }, [applyDiagramSnapshot, updateHistoryAvailability]);

    const redoDiagramChange = React.useCallback(() => {
        if (redoStackRef.current.length === 0) {
            return false;
        }

        const nextSnapshot = redoStackRef.current.pop();

        undoStackRef.current.push(nextSnapshot);
        applyDiagramSnapshot(nextSnapshot);
        updateHistoryAvailability();

        return true;
    }, [applyDiagramSnapshot, updateHistoryAvailability]);

    return {
        canUndo,
        canRedo,
        resetDiagramHistory,
        recordCurrentDiagramInHistory,
        undoDiagramChange,
        redoDiagramChange,
    };
}
