import * as React from "react";
import "./styles/diagramEditor.css";
import { default as MxGraph } from "mxgraph";
import { Toaster } from "react-hot-toast";
import { APP_VERSION, BUILD_COMMIT, BUILD_DATE } from "../../buildInfo";
import {
    canRelationHoldAttributes,
    findAttributeTreeOwnerById,
    findEntityById,
    findRelationById,
    getWeakSideOfIdentifyingRelation,
    isIdentifyingRelation,
    isSelfRelation,
    isWeakEntity,
    updateAttributePosition,
} from "../../domain/er";
import { useLanguage } from "../../i18n/LanguageContext";
import { useAttributeActions } from "./hooks/useAttributeActions";
import { useDeletionActions } from "./hooks/useDeletionActions";
import { useDiagramHistory } from "./hooks/useDiagramHistory";
import { useDiagramPersistence } from "./hooks/useDiagramPersistence";
import { useIsaActions } from "./hooks/useIsaActions";
import { useRelationActions } from "./hooks/useRelationActions";
import { DiagramEditorGlobalActions } from "./panels/DiagramEditorGlobalActions";
import { DiagramEditorSidebar } from "./panels/DiagramEditorSidebar";
import { installCellGeometrySyncHandlers } from "./utils/graph/graphCanvas";
import { installGraphInteractionOverrides } from "./utils/graph/graphInteractionOverrides";
import { installGraphLabelEditingHandler } from "./utils/graph/graphLabelEditing";
import setInitialConfiguration from "./utils/graph/setInitialConfiguration";
import {
    installDiagramEditorStyles,
    isAttributeShapeCell,
    isEntityShapeCell,
    isRelationShapeCell,
} from "./utils/mxStyles/diagramStyles";
import { createAttributeRenderingHelpers } from "./utils/rendering/attributeRendering";
import {
    createEntityRenderingHelpers,
    isWeakEntityDecoratorCell,
} from "./utils/rendering/entityRendering";
import {
    createRelationRenderingHelpers,
    isIdentifyingRelationDecoratorCell,
} from "./utils/rendering/relationRendering";

const { mxGraph, mxEvent, mxConstants, mxPoint, mxGeometry } = MxGraph();

export default function DiagramEditor({ onSelected: onSelectedProp } = {}) {
    const { language, setLanguage, t } = useLanguage();

    const BUILD_LABEL = t("app.buildLabel", {
        version: APP_VERSION,
        date: BUILD_DATE,
        commit: BUILD_COMMIT,
    });

    const containerRef = React.useRef(null);
    const toolbarRef = React.useRef(null);

    const [graph, setGraph] = React.useState(null);
    const diagramRef = React.useRef({
        entities: [],
        relations: [],
        isas: [],
    });
    const [selected, setSelected] = React.useState(null);
    const [selectionSize, setSelectionSize] = React.useState(0);
    const [selectionVersion, setSelectionVersion] = React.useState(0);

    const [entityWithAttributesHidden, setEntityWithAttributesHidden] =
        React.useState(null);

    const [refreshDiagram, setRefreshDiagram] = React.useState(false);
    const [isDiagramEmpty, setIsDiagramEmpty] = React.useState(true);

    const updateEmptyCanvasState = React.useCallback(
        (diagram = diagramRef.current) => {
            setIsDiagramEmpty(
                (diagram.entities?.length ?? 0) === 0 &&
                    (diagram.relations?.length ?? 0) === 0 &&
                    (diagram.isas?.length ?? 0) === 0,
            );
        },
        [],
    );

    const onSelected = React.useCallback(
        (evt) => {
            if (onSelectedProp) {
                onSelectedProp(evt);
            }

            const selectedCells =
                typeof graph?.getSelectionCells === "function"
                    ? graph.getSelectionCells().filter(Boolean)
                    : (evt.cells ?? []).filter(Boolean);

            setSelectionSize(selectedCells.length);
            setSelected(selectedCells.length === 1 ? selectedCells[0] : null);
            setSelectionVersion((prevVersion) => prevVersion + 1);
        },
        [onSelectedProp, graph],
    );

    function accessCell(idMx) {
        if (!idMx || !graph?.model?.cells) {
            return null;
        }

        return graph.model.cells[idMx] ?? null;
    }

    const {
        getWeakEntityDecoratorId,
        createWeakEntityDecorator,
        syncWeakEntityDecorator,
        ensureWeakEntityDecorator,
        removeWeakEntityDecorator,
    } = createEntityRenderingHelpers({
        graph,
        accessCell,
    });

    const {
        syncSelfRelationEdges,
        syncRepeatedParticipantRelationEdges,
        syncIdentifyingRelationDecorator,
        ensureIdentifyingRelationDecorator,
        removeIdentifyingRelationDecorator,
        syncIdentifyingRelationEdgeDecorator,
        ensureIdentifyingRelationEdgeDecorator,
        removeIdentifyingRelationEdgeDecorator,
    } = createRelationRenderingHelpers({
        graph,
        accessCell,
        mxPoint,
        mxGeometry,
        getWeakSideOfIdentifyingRelation: (relationData) =>
            getWeakSideOfIdentifyingRelation(diagramRef.current, relationData),
    });

    const {
        getAttributesCells,
        removeAttributesCells,
        syncOwnerAttributePositions,
        syncDiscriminantUnderline,
        ensureDiscriminantUnderline,
        syncMultivaluedAttributeDecorator,
        ensureMultivaluedAttributeDecorator,
        syncAttributeVisualRepresentation,
        syncAttributeChildrenPositions,
        removeAttributeConnectionEdges,
        reparentAttributeCellToCurrentOwner,
        createAttributeGraphCells,
        setOwnerAttributesVisible,
    } = createAttributeRenderingHelpers({
        graph,
        accessCell,
        mxPoint,
        mxGeometry,
        updateAttributePosition,
    });

    const clearEditorSelection = React.useCallback(() => {
        if (typeof graph?.clearSelection === "function") {
            graph.clearSelection();
        }

        setSelected(null);
        setSelectionVersion((prevVersion) => prevVersion + 1);
    }, [graph]);

    const {
        composeDiagramWithCurrent,
        applyDiagramData: applyDiagramDataWithoutHistory,
        recreateGraphFromLocalStorage,
        syncAndPersistDiagramData: syncAndPersistDiagramDataWithoutHistory,
        applyHistoryDiagramData,
        resetCanvas: resetCanvasWithoutHistory,
    } = useDiagramPersistence({
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
    });

    const {
        canUndo,
        canRedo,
        resetDiagramHistory,
        recordCurrentDiagramInHistory,
        undoDiagramChange,
        redoDiagramChange,
    } = useDiagramHistory({
        diagramRef,
        canApplySnapshot: () => Boolean(graph),
        applyDiagramSnapshotData: applyHistoryDiagramData,
    });

    const applyDiagramData = (diagramData) => {
        const diagramApplied = applyDiagramDataWithoutHistory(diagramData);

        if (diagramApplied) {
            recordCurrentDiagramInHistory();
        }
    };

    const syncAndPersistDiagramData = ({ recordHistory = true } = {}) => {
        const diagramSynced = syncAndPersistDiagramDataWithoutHistory();

        if (recordHistory && diagramSynced) {
            recordCurrentDiagramInHistory();
        }
    };

    const resetCanvas = ({ recordHistory = false } = {}) => {
        const canvasReset = resetCanvasWithoutHistory({
            persist: recordHistory,
        });

        if (recordHistory && canvasReset) {
            recordCurrentDiagramInHistory();
        }
    };

    const shouldIgnoreEditorKeyboardShortcut = (event) => {
        if (
            document.querySelector(
                '[role="dialog"], [role="listbox"], .MuiPopover-root, .MuiModal-root',
            )
        ) {
            return true;
        }

        const target = event.target;

        if (!(target instanceof Element)) {
            return false;
        }

        if (target.closest(".mxCellEditor")) {
            return true;
        }

        if (
            target.closest(
                'input, textarea, select, [contenteditable="true"], [role="textbox"]',
            )
        ) {
            return true;
        }

        return false;
    };

    const isUndoKeyboardShortcut = (event) =>
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "z";

    const isRedoKeyboardShortcut = (event) =>
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        (event.key.toLowerCase() === "y" ||
            (event.shiftKey && event.key.toLowerCase() === "z"));

    React.useEffect(() => {
        if (!graph) {
            mxEvent.disableContextMenu(containerRef.current);
            setGraph(new mxGraph(containerRef.current));
        }
        if (graph) {
            // Expose mxGraph instance only for Playwright E2E
            if (typeof window !== "undefined" && window.__PW__) {
                window.__DEBUG_GRAPH__ = graph;
            }

            setInitialConfiguration(graph, diagramRef, toolbarRef);

            graph.getSelectionModel().addListener(mxEvent.CHANGE, onSelected);

            installDiagramEditorStyles({ graph, mxConstants });

            const cleanupGraphInteractionOverrides =
                installGraphInteractionOverrides({
                    graph,
                    mxGraph,
                    accessCell,
                    getDiagram: () => diagramRef.current,
                });

            const cleanupGraphLabelEditingHandler =
                installGraphLabelEditingHandler({
                    graph,
                    getDiagram: () => diagramRef.current,
                    accessCell,
                    isWeakEntity,
                    isIdentifyingRelation,
                    isWeakEntityDecoratorCell,
                    isIdentifyingRelationDecoratorCell,
                    findEntityById,
                    findRelationById,
                    getAttributeOwnerById: (attributeId) =>
                        findAttributeTreeOwnerById(
                            diagramRef.current,
                            attributeId,
                        ),
                    syncAttributeVisualRepresentation,
                    syncWeakEntityDecorator,
                    syncIdentifyingRelationDecorator,
                    syncIdentifyingRelationEdgeDecorator,
                    updateDiagramData: syncAndPersistDiagramData,
                });

            recreateGraphFromLocalStorage();
            resetDiagramHistory();

            return () => {
                graph
                    .getSelectionModel()
                    .removeListener(mxEvent.CHANGE, onSelected);
                cleanupGraphLabelEditingHandler();
                cleanupGraphInteractionOverrides();
            };
        }
    }, [graph, onSelected]);

    const refreshGraph = () => {
        const graphView = graph.getDefaultParent();
        const view = graph.getView(graphView);
        view.refresh();
    };

    const {
        getSelectedRelationData,
        clearIdentifyingRelationSemantics,
        syncRelationCardinalityLabels,
        removeRelationAttributes,
        removeRelationConfiguration,
        toggleIdentifyingRelation,
    } = useRelationActions({
        graph,
        selected,
        diagramRef,
        accessCell,
        t,
        getAttributesCells,
        removeAttributesCells,
        removeIdentifyingRelationDecorator,
        removeIdentifyingRelationEdgeDecorator,
        ensureIdentifyingRelationDecorator,
        ensureIdentifyingRelationEdgeDecorator,
        ensureWeakEntityDecorator,
        syncAttributeVisualRepresentation,
        refreshGraph,
        syncAndPersistDiagramData,
        setRefreshDiagram,
    });

    const {
        getSelectedIsaData,
        removeIsaConfiguration,
        configureIsaHierarchy,
    } = useIsaActions({
        graph,
        selected,
        diagramRef,
        accessCell,
        t,
        syncAttributeVisualRepresentation,
        syncAndPersistDiagramData,
    });

    const {
        getSelectedEntityData,
        getSelectedEntityAttributeKeyData,
        getSelectedEntityMultivaluedAttributeData,
        getSelectedSimpleEntityAttributesForGrouping,
        addAttribute,
        canAddChildAttributeToSelectedAttribute,
        groupSelectedSimpleAttributesIntoComposite,
        addChildAttribute,
        hideAttributes,
        showAttributes,
        toggleAttrKey,
        toggleWeakEntity,
        togglePartialKey,
        toggleMultivaluedAttribute,
        canConvertSelectedSubattributeToSimpleAttribute,
        convertSelectedSubattributeToSimpleAttribute,
    } = useAttributeActions({
        graph,
        selected,
        diagramRef,
        accessCell,
        t,
        createAttributeGraphCells,
        syncWeakEntityDecorator,
        ensureWeakEntityDecorator,
        removeWeakEntityDecorator,
        syncAttributeVisualRepresentation,
        removeAttributeConnectionEdges,
        reparentAttributeCellToCurrentOwner,
        removeAttributesCells,
        setOwnerAttributesVisible,
        refreshGraph,
        syncAndPersistDiagramData,
        setRefreshDiagram,
        setEntityWithAttributesHidden,
        clearIdentifyingRelationSemantics,
    });

    const { canDeleteSelectedAttribute, deleteSelectedDiagramElements } =
        useDeletionActions({
            graph,
            selected,
            diagramRef,
            accessCell,
            getAttributesCells,
            getWeakEntityDecoratorId,
            removeAttributesCells,
            reparentAttributeCellToCurrentOwner,
            syncAttributeVisualRepresentation,
            clearIdentifyingRelationSemantics,
            removeRelationConfiguration,
            removeIsaConfiguration,
            refreshGraph,
            syncAndPersistDiagramData,
            clearEditorSelection,
        });

    React.useEffect(() => {
        if (!graph) return;

        const cleanupCellGeometrySyncHandlers = installCellGeometrySyncHandlers(
            {
                graph,
                mxEvent,
                getSelectedCell: () => selected,
                getDiagram: () => diagramRef.current,
                accessCell,
                isEntityShapeCell,
                isRelationShapeCell,
                isAttributeShapeCell,
                isWeakEntityDecoratorCell,
                isIdentifyingRelationDecoratorCell,
                findEntityById,
                findRelationById,
                findAttributeTreeOwnerById,
                isWeakEntity,
                isSelfRelation,
                isIdentifyingRelation,
                canRelationHoldAttributes,
                updateAttributePosition,
                syncOwnerAttributePositions,
                syncAttributeChildrenPositions,
                syncAttributeVisualRepresentation,
                syncWeakEntityDecorator,
                syncSelfRelationEdges,
                syncRepeatedParticipantRelationEdges,
                syncIdentifyingRelationDecorator,
                syncIdentifyingRelationEdgeDecorator,
                syncMultivaluedAttributeDecorator,
                syncDiscriminantUnderline,
                refreshGraph,
                syncAndPersistDiagramData,
            },
        );

        syncAndPersistDiagramData();

        return cleanupCellGeometrySyncHandlers;
    }, [graph, selected, refreshDiagram]);

    const pushCellsBack = (moveBack) => () => {
        graph.orderCells(moveBack);
    };

    React.useEffect(() => {
        if (!graph) {
            return;
        }

        const handleKeyDown = (event) => {
            if (shouldIgnoreEditorKeyboardShortcut(event)) {
                return;
            }

            if (isUndoKeyboardShortcut(event)) {
                event.preventDefault();
                event.stopPropagation();

                undoDiagramChange();
                return;
            }

            if (isRedoKeyboardShortcut(event)) {
                event.preventDefault();
                event.stopPropagation();

                redoDiagramChange();
                return;
            }

            if (event.key !== "Delete") {
                return;
            }

            const deleted = deleteSelectedDiagramElements();

            if (deleted) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [graph, selected, selectionVersion, canUndo, canRedo]);

    return (
        <div className="mxgraph-container">
            <div className="build-info-badge" title={BUILD_LABEL}>
                <span className="build-info-label">{t("app.version")}</span>
                <span className="build-info-value">{APP_VERSION}</span>

                <span className="build-info-label">{t("app.date")}</span>
                <span className="build-info-value">{BUILD_DATE}</span>

                <span className="build-info-label">{t("app.commit")}</span>
                <span className="build-info-value">{BUILD_COMMIT}</span>
            </div>
            <div className="mxgraph-toolbar-container">
                <DiagramEditorGlobalActions
                    graph={graph}
                    toolbarRef={toolbarRef}
                    language={language}
                    setLanguage={setLanguage}
                    t={t}
                    diagramRef={diagramRef}
                    isDiagramEmpty={isDiagramEmpty}
                    clearEditorSelection={clearEditorSelection}
                    setRefreshDiagram={setRefreshDiagram}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    undoDiagramChange={undoDiagramChange}
                    redoDiagramChange={redoDiagramChange}
                    composeDiagramWithCurrent={composeDiagramWithCurrent}
                    applyDiagramData={applyDiagramData}
                    resetCanvas={resetCanvas}
                >
                    <DiagramEditorSidebar
                        graph={graph}
                        selected={selected}
                        selectionSize={selectionSize}
                        entityWithAttributesHidden={entityWithAttributesHidden}
                        setEntityWithAttributesHidden={
                            setEntityWithAttributesHidden
                        }
                        diagramRef={diagramRef}
                        accessCell={accessCell}
                        t={t}
                        pushCellsBack={pushCellsBack}
                        syncSelfRelationEdges={syncSelfRelationEdges}
                        syncRepeatedParticipantRelationEdges={
                            syncRepeatedParticipantRelationEdges
                        }
                        refreshGraph={refreshGraph}
                        syncAndPersistDiagramData={syncAndPersistDiagramData}
                        getSelectedEntityData={getSelectedEntityData}
                        getSelectedRelationData={getSelectedRelationData}
                        getSelectedIsaData={getSelectedIsaData}
                        getSelectedEntityAttributeKeyData={
                            getSelectedEntityAttributeKeyData
                        }
                        getSelectedEntityMultivaluedAttributeData={
                            getSelectedEntityMultivaluedAttributeData
                        }
                        getSelectedSimpleEntityAttributesForGrouping={
                            getSelectedSimpleEntityAttributesForGrouping
                        }
                        addAttribute={addAttribute}
                        canAddChildAttributeToSelectedAttribute={
                            canAddChildAttributeToSelectedAttribute
                        }
                        groupSelectedSimpleAttributesIntoComposite={
                            groupSelectedSimpleAttributesIntoComposite
                        }
                        addChildAttribute={addChildAttribute}
                        hideAttributes={hideAttributes}
                        showAttributes={showAttributes}
                        toggleAttrKey={toggleAttrKey}
                        toggleWeakEntity={toggleWeakEntity}
                        togglePartialKey={togglePartialKey}
                        toggleMultivaluedAttribute={toggleMultivaluedAttribute}
                        canConvertSelectedSubattributeToSimpleAttribute={
                            canConvertSelectedSubattributeToSimpleAttribute
                        }
                        convertSelectedSubattributeToSimpleAttribute={
                            convertSelectedSubattributeToSimpleAttribute
                        }
                        clearIdentifyingRelationSemantics={
                            clearIdentifyingRelationSemantics
                        }
                        syncRelationCardinalityLabels={
                            syncRelationCardinalityLabels
                        }
                        removeRelationAttributes={removeRelationAttributes}
                        toggleIdentifyingRelation={toggleIdentifyingRelation}
                        configureIsaHierarchy={configureIsaHierarchy}
                        canDeleteSelectedAttribute={canDeleteSelectedAttribute}
                        deleteSelectedDiagramElements={
                            deleteSelectedDiagramElements
                        }
                    />
                </DiagramEditorGlobalActions>
            </div>
            {isDiagramEmpty && (
                <div
                    className="empty-canvas-onboarding-layer"
                    aria-live="polite"
                >
                    <div className="empty-canvas-onboarding">
                        <p className="empty-canvas-onboarding-title">
                            {t("emptyCanvas.title")}
                        </p>
                        <p className="empty-canvas-onboarding-text">
                            {t("emptyCanvas.text")}
                        </p>
                    </div>
                </div>
            )}

            <div ref={containerRef} className="mxgraph-drawing-container" />
            <Toaster position="bottom-left" />
        </div>
    );
}
