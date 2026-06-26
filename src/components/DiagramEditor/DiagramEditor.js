import * as React from "react";
import "./styles/diagramEditor.css";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
} from "@mui/material";
import { default as MxGraph } from "mxgraph";
import toast, { Toaster } from "react-hot-toast";
import { APP_VERSION, BUILD_COMMIT, BUILD_DATE } from "../../buildInfo";
import {
    DIAGRAM_COMPOSITION_MODES,
    GENERATE_STRUCTURE_TEMPLATES,
    IDENTIFYING_RELATION_STRONG_SIDE_CARDINALITY,
    IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITIES,
    POSSIBLE_CARDINALITIES,
    RELATION_ARITIES,
    TERNARY_RELATION_CARDINALITIES,
    canRelationHoldAttributes,
    canRelationTypeHoldAttributes,
    createEmptyRelationSide,
    createExampleDiagramStructure,
    findAttributeTreeOwnerById,
    findEntityById,
    findEntityIndexById,
    findIsaIndexById,
    findRelationById,
    findRelationIndexById,
    getGenerateStructureTemplateById,
    getRelationArity,
    getRelationCardinalityDisplayValue,
    getRelationSideDisplayName,
    getRelationSideKeys,
    getRelationSideLabelDisplayValue,
    getWeakAndStrongSidesForRelation,
    getWeakSideOfIdentifyingRelation,
    isBinaryRelation,
    isEntityIsaSpecialization,
    isIdentifyingRelation,
    isMultivaluedAttribute,
    isPrimaryKeyAttribute,
    isRelationAttributeOwner,
    isRelationConfigured,
    isSelfRelation,
    isTernaryRelation,
    isWeakEntity,
    isaInvolvesEntity,
    relationInvolvesEntity,
    removeAttributeFromOwnerTreeByIdWithPromotion,
    resetRelationSides,
    updateAttributePosition,
    validateGraph,
} from "../../domain/er";
import { useLanguage } from "../../i18n/LanguageContext";
import { SUPPORTED_LANGUAGES } from "../../i18n/translations";
import { generateSQL } from "../../services/sql";
import { useAttributeActions } from "./hooks/useAttributeActions";
import { useDiagramHistory } from "./hooks/useDiagramHistory";
import { useDiagramPersistence } from "./hooks/useDiagramPersistence";
import { useIsaActions } from "./hooks/useIsaActions";
import { useRelationActions } from "./hooks/useRelationActions";
import {
    connectRelationGraphSides,
    fitGraphToDiagram,
    getConfiguredRelationGraphCells,
    installCellGeometrySyncHandlers,
    removeEntityGraphCells,
    removeExistingGraphCells,
    removeIsaGraphCells,
    removeRelationConfigurationGraphCells,
    removeRelationGraphCells,
} from "./utils/graph/graphCanvas";
import { installGraphInteractionOverrides } from "./utils/graph/graphInteractionOverrides";
import { installGraphLabelEditingHandler } from "./utils/graph/graphLabelEditing";
import setInitialConfiguration from "./utils/graph/setInitialConfiguration";
import {
    getAttributeDimensions,
    getCardinalityStyleString,
    getRelationStyleString,
    installDiagramEditorStyles,
    isAttributeShapeCell,
    isEntityShapeCell,
    isIsaShapeCell,
    isRelationShapeCell,
} from "./utils/mxStyles/diagramStyles";
import {
    DIAGRAM_IMAGE_EXPORT_FORMATS,
    SAVE_FILE_RESULT,
    exportDiagramImageToFile,
    exportDiagramToJsonFile,
    exportSqlScriptToFile,
    readDiagramJsonFile,
} from "./utils/persistence/filePersistence";
import { createAttributeRenderingHelpers } from "./utils/rendering/attributeRendering";
import {
    createEntityRenderingHelpers,
    isWeakEntityDecoratorCell,
} from "./utils/rendering/entityRendering";
import {
    createRelationRenderingHelpers,
    isIdentifyingRelationDecoratorCell,
} from "./utils/rendering/relationRendering";
import {
    VALIDATION_SECTION_TITLE_KEYS,
    getValidationDialogMessages,
} from "./utils/validation/validationMessages";

const { mxGraph, mxEvent, mxConstants, mxPoint, mxGeometry } = MxGraph();

const SidebarSection = ({ title, children }) => {
    const visibleChildren = React.Children.toArray(children).filter(Boolean);

    if (visibleChildren.length === 0) {
        return null;
    }

    return (
        <div className="sidebar-section">
            <p className="sidebar-section-title">{title}</p>
            <div className="sidebar-section-content">{visibleChildren}</div>
        </div>
    );
};

const renderSidebarAction = (action) => {
    if (!action) {
        return null;
    }

    return <div>{action}</div>;
};

const getActionTooltip = (label, shortcut) =>
    shortcut ? `${label} (${shortcut})` : label;

const SidebarActionButton = ({
    children,
    className = "",
    tooltip,
    ariaLabel,
    ...props
}) => {
    const title =
        tooltip ?? (typeof children === "string" ? children : undefined);

    const buttonClassName = ["button-toolbar-action", className]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            type="button"
            {...props}
            className={buttonClassName}
            title={title}
            aria-label={ariaLabel}
        >
            {children}
        </button>
    );
};

const SidebarActionIcon = ({ children }) => (
    <span className="button-toolbar-action-icon" aria-hidden="true">
        {children}
    </span>
);

const renderValidationDialogMessage = (message, index, sectionTitles) => {
    const isSectionTitle = sectionTitles.has(message);
    const isDetailMessage = message.startsWith("- ");

    return (
        <DialogContentText
            key={`${message}-${index}`}
            sx={{
                fontWeight: isSectionTitle ? 700 : "inherit",
                mt: isSectionTitle && index > 0 ? 1 : 0,
                pl: isDetailMessage ? 2 : 0,
            }}
        >
            {message}
        </DialogContentText>
    );
};

const DRAGGABLE_DIALOG_TITLE_CLASS = "draggable-dialog-title";

const DraggableDialogPaper = React.forwardRef(
    function DraggableDialogPaper(props, ref) {
        const { onMouseDown, style, ...paperProps } = props;
        const [position, setPosition] = React.useState({ x: 0, y: 0 });
        const positionRef = React.useRef(position);
        const dragStateRef = React.useRef(null);

        React.useEffect(() => {
            positionRef.current = position;
        }, [position]);

        const handleMouseMove = React.useCallback((event) => {
            const dragState = dragStateRef.current;

            if (!dragState) {
                return;
            }

            const nextPosition = {
                x: dragState.initialX + event.clientX - dragState.startX,
                y: dragState.initialY + event.clientY - dragState.startY,
            };

            positionRef.current = nextPosition;
            setPosition(nextPosition);
        }, []);

        const handleMouseUp = React.useCallback(() => {
            dragStateRef.current = null;
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        }, [handleMouseMove]);

        React.useEffect(
            () => () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
            },
            [handleMouseMove, handleMouseUp],
        );

        const handleMouseDown = (event) => {
            onMouseDown?.(event);

            const target = event.target;

            if (
                !(target instanceof Element) ||
                !target.closest(`.${DRAGGABLE_DIALOG_TITLE_CLASS}`)
            ) {
                return;
            }

            if (event.button !== 0) {
                return;
            }

            event.preventDefault();

            dragStateRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                initialX: positionRef.current.x,
                initialY: positionRef.current.y,
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        };

        return (
            <Paper
                ref={ref}
                {...paperProps}
                onMouseDown={handleMouseDown}
                style={{
                    ...style,
                    transform: `translate(${position.x}px, ${position.y}px)`,
                }}
            />
        );
    },
);

export default function DiagramEditor(props) {
    const { language, setLanguage, t } = useLanguage();

    const BUILD_LABEL = t("app.buildLabel", {
        version: APP_VERSION,
        date: BUILD_DATE,
        commit: BUILD_COMMIT,
    });

    const BUILD_TITLE_LABEL = t("app.buildTitleLabel", {
        version: APP_VERSION,
    });

    const BUILD_METADATA_LABEL = t("app.buildMetadataLabel", {
        date: BUILD_DATE,
        commit: BUILD_COMMIT,
    });

    const validationDialogSectionTitles = React.useMemo(
        () =>
            new Set(
                Object.values(VALIDATION_SECTION_TITLE_KEYS).map((key) =>
                    t(key),
                ),
            ),
        [t],
    );

    const renderLocalizedValidationDialogMessage = React.useCallback(
        (message, index) =>
            renderValidationDialogMessage(
                message,
                index,
                validationDialogSectionTitles,
            ),
        [validationDialogSectionTitles],
    );

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
            if (props.onSelected) {
                props.onSelected(evt);
            }

            const selectedCells =
                typeof graph?.getSelectionCells === "function"
                    ? graph.getSelectionCells().filter(Boolean)
                    : (evt.cells ?? []).filter(Boolean);

            setSelectionSize(selectedCells.length);
            setSelected(selectedCells.length === 1 ? selectedCells[0] : null);
            setSelectionVersion((prevVersion) => prevVersion + 1);
        },
        [props, graph],
    );

    function accessCell(idMx) {
        return graph.model.cells[idMx];
    }

    const showSaveFileResultToast = (result) => {
        if (result === SAVE_FILE_RESULT.SAVED) {
            toast.success(t("feedback.fileSaved"));
            return;
        }

        if (result === SAVE_FILE_RESULT.CANCELLED) {
            toast(t("feedback.fileSaveCancelled"));
            return;
        }

        if (result === SAVE_FILE_RESULT.UNSUPPORTED) {
            toast.error(t("feedback.fileSaveUnsupported"));
            return;
        }

        toast.error(t("feedback.fileSaveFailed"));
    };

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

    const clearEditorSelection = () => {
        if (typeof graph?.clearSelection === "function") {
            graph.clearSelection();
        }

        setSelected(null);
        setSelectionVersion((prevVersion) => prevVersion + 1);
    };

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

    const MoveBackAndFrontButtons = () =>
        selected && (
            <React.Fragment>
                <SidebarActionButton onClick={pushCellsBack(true)}>
                    {t("action.sendToBack")}
                </SidebarActionButton>
                <SidebarActionButton onClick={pushCellsBack(false)}>
                    {t("action.bringToFront")}
                </SidebarActionButton>
            </React.Fragment>
        );

    const hasMultipleSelectedCells = selectionSize > 1;

    const SelectedElementHeader = () => {
        if (!selected) {
            return null;
        }

        let selectedType = "";

        if (
            isEntityShapeCell(selected) &&
            !isWeakEntityDecoratorCell(selected)
        ) {
            selectedType = t("selection.selectedEntity");
        } else if (
            isRelationShapeCell(selected) &&
            !isIdentifyingRelationDecoratorCell(selected)
        ) {
            selectedType = t("selection.selectedRelation");
        } else if (isIsaShapeCell(selected)) {
            selectedType = t("selection.selectedIsa");
        } else if (isAttributeShapeCell(selected)) {
            selectedType = t("selection.selectedAttribute");
        } else {
            return null;
        }

        return <p className="selected-element-kind">{selectedType}</p>;
    };

    const EmptySelectionGuidance = () => {
        if (selected) {
            return null;
        }

        if (hasMultipleSelectedCells) {
            return (
                <p className="empty-selection-guidance">
                    {t("selection.multipleGuidance")}
                </p>
            );
        }

        return (
            <p className="empty-selection-guidance">
                {t("selection.emptyGuidance")}
            </p>
        );
    };

    const AddAttributeButton = () => {
        if (
            isEntityShapeCell(selected) &&
            !isWeakEntityDecoratorCell(selected)
        ) {
            return (
                <SidebarActionButton onClick={addAttribute}>
                    {t("action.addAttribute")}
                </SidebarActionButton>
            );
        }
    };

    const RelationAddAttributeButton = () => {
        if (
            canRelationHoldAttributes(
                findRelationById(diagramRef.current, selected?.id),
            )
        ) {
            return (
                <SidebarActionButton onClick={addAttribute}>
                    {t("action.addAttribute")}
                </SidebarActionButton>
            );
        }
    };

    const GroupSelectedAttributesButton = () => {
        void selectionVersion;

        if (!getSelectedSimpleEntityAttributesForGrouping()) {
            return;
        }

        return (
            <SidebarActionButton
                onClick={groupSelectedSimpleAttributesIntoComposite}
            >
                {t("action.groupCompositeAttribute")}
            </SidebarActionButton>
        );
    };

    const AddChildAttributeButton = () => {
        if (!isAttributeShapeCell(selected)) {
            return;
        }

        const selectedAttributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected?.id,
        );

        if (!selectedAttributeOwner) {
            return;
        }

        if (!canAddChildAttributeToSelectedAttribute(selectedAttributeOwner)) {
            return;
        }

        return (
            <SidebarActionButton onClick={addChildAttribute}>
                {t("action.addSiblingSubattribute")}
            </SidebarActionButton>
        );
    };

    const ConvertSubattributeToSimpleButton = () => {
        if (!isAttributeShapeCell(selected)) {
            return;
        }

        const selectedAttributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected?.id,
        );

        if (
            !canConvertSelectedSubattributeToSimpleAttribute(
                selectedAttributeOwner,
            )
        ) {
            return;
        }

        return (
            <SidebarActionButton
                onClick={convertSelectedSubattributeToSimpleAttribute}
            >
                {t("action.convertToSimpleAttribute")}
            </SidebarActionButton>
        );
    };

    const ToggleAttributesButton = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);
        const isRelationNM =
            isRelationShapeCell(selected) &&
            canRelationHoldAttributes(
                findRelationById(diagramRef.current, selected?.id),
            );

        if (isEntity || isRelationNM) {
            if (
                entityWithAttributesHidden &&
                !entityWithAttributesHidden.hasOwnProperty(selected.id)
            ) {
                const updatedAttributesHidden = {
                    ...entityWithAttributesHidden,
                };
                updatedAttributesHidden[selected.id] = false;
                setEntityWithAttributesHidden(updatedAttributesHidden);
            }
            const attributesHidden = entityWithAttributesHidden?.[selected.id];

            if (attributesHidden !== true) {
                return (
                    <SidebarActionButton
                        onClick={() => hideAttributes(isRelationNM)}
                    >
                        {t("action.hideAttributes")}
                    </SidebarActionButton>
                );
            }
            return (
                <SidebarActionButton
                    onClick={() => showAttributes(isRelationNM)}
                >
                    {t("action.showAttributes")}
                </SidebarActionButton>
            );
        }
    };

    const ToggleAttrKeyButton = () => {
        const isAttribute = isAttributeShapeCell(selected);

        if (!isAttribute) {
            return;
        }

        const selectedEntityAttribute = getSelectedEntityAttributeKeyData();

        if (!selectedEntityAttribute) {
            return;
        }

        const { entity, attribute } = selectedEntityAttribute;

        if (isMultivaluedAttribute(attribute)) {
            return;
        }

        if (isWeakEntity(entity)) {
            return;
        }

        if (isEntityIsaSpecialization(diagramRef.current, entity.idMx)) {
            return;
        }

        return (
            <SidebarActionButton onClick={toggleAttrKey}>
                {attribute.key
                    ? t("action.removeKey")
                    : t("action.convertToKey")}
            </SidebarActionButton>
        );
    };

    const TogglePartialKeyButton = () => {
        const isAttribute = isAttributeShapeCell(selected);
        const selectedEntityAttribute = getSelectedEntityAttributeKeyData();

        if (!isAttribute || !selectedEntityAttribute) {
            return;
        }

        const { entity, attribute } = selectedEntityAttribute;

        if (isMultivaluedAttribute(attribute)) {
            return;
        }

        if (!isWeakEntity(entity)) {
            return;
        }

        if (attribute.key) {
            return;
        }

        return (
            <SidebarActionButton onClick={togglePartialKey}>
                {attribute.partialKey
                    ? t("action.removeDiscriminant")
                    : t("action.convertToDiscriminant")}
            </SidebarActionButton>
        );
    };

    const ToggleMultivaluedAttributeButton = () => {
        const isAttribute = isAttributeShapeCell(selected);
        const selectedEntityAttribute =
            getSelectedEntityMultivaluedAttributeData();

        if (!isAttribute || !selectedEntityAttribute) {
            return;
        }

        const { attribute, isCompositeMultivaluedTarget } =
            selectedEntityAttribute;

        if (attribute.key || attribute.partialKey) {
            return;
        }

        const label = isCompositeMultivaluedTarget
            ? isMultivaluedAttribute(attribute)
                ? t("action.removeCompositeMultivalued")
                : t("action.markCompositeMultivalued")
            : isMultivaluedAttribute(attribute)
              ? t("action.removeMultivalued")
              : t("action.markMultivalued");

        return (
            <SidebarActionButton onClick={toggleMultivaluedAttribute}>
                {label}
            </SidebarActionButton>
        );
    };

    const ToggleWeakEntityButton = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);

        const selectedEntityDiag = getSelectedEntityData();

        if (isEntity && selectedEntityDiag) {
            return (
                <SidebarActionButton onClick={toggleWeakEntity}>
                    {isWeakEntity(selectedEntityDiag)
                        ? t("action.removeWeakEntity")
                        : t("action.markWeakEntity")}
                </SidebarActionButton>
            );
        }
    };

    const ToggleIdentifyingRelationButton = () => {
        const isRelation = isRelationShapeCell(selected);
        const selectedRelationDiag = getSelectedRelationData();

        if (
            isRelation &&
            selectedRelationDiag &&
            isBinaryRelation(selectedRelationDiag)
        ) {
            return (
                <SidebarActionButton onClick={toggleIdentifyingRelation}>
                    {isIdentifyingRelation(selectedRelationDiag)
                        ? t("action.unmarkIdentifyingRelation")
                        : t("action.markIdentifyingRelation")}
                </SidebarActionButton>
            );
        }
    };

    const RelationConfigurationButton = () => {
        const isRelation = isRelationShapeCell(selected);
        const [open, setOpen] = React.useState(false);
        const [relationArity, setRelationArity] = React.useState(
            RELATION_ARITIES.BINARY,
        );
        const [side1, setSide1] = React.useState("");
        const [side2, setSide2] = React.useState("");
        const [side3, setSide3] = React.useState("");
        const [side1Role, setSide1Role] = React.useState("");
        const [side2Role, setSide2Role] = React.useState("");
        const [side3Role, setSide3Role] = React.useState("");

        const selectedArityIsTernary =
            relationArity === RELATION_ARITIES.TERNARY;

        const selectedRelationSides = {
            side1,
            side2,
            side3,
        };

        const getSelectedSideEntityId = (sideKey) =>
            selectedRelationSides[sideKey]?.idMx ?? "";

        const sideRequiresRole = (sideKey) => {
            if (!selectedArityIsTernary) {
                return false;
            }

            const sideEntityId = getSelectedSideEntityId(sideKey);

            if (!sideEntityId) {
                return false;
            }

            const repeatedSideCount = ["side1", "side2", "side3"].filter(
                (currentSideKey) =>
                    getSelectedSideEntityId(currentSideKey) === sideEntityId,
            ).length;

            return repeatedSideCount > 1;
        };

        const getSelectedRoleForSide = (sideKey) => {
            if (!sideRequiresRole(sideKey)) {
                return "";
            }

            if (sideKey === "side1") return side1Role;
            if (sideKey === "side2") return side2Role;
            if (sideKey === "side3") return side3Role;

            return "";
        };

        const handleClickOpen = () => {
            const relation = findRelationById(diagramRef.current, selected?.id);

            setRelationArity(getRelationArity(relation));
            setSide1("");
            setSide2("");
            setSide3("");
            setSide1Role("");
            setSide2Role("");
            setSide3Role("");
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const applySelectedRelationArity = (relation) => {
            if (selectedArityIsTernary) {
                relation.arity = RELATION_ARITIES.TERNARY;
                relation.side3 = relation.side3 ?? createEmptyRelationSide();
                return;
            }

            relation.arity = undefined;
            relation.side3 = undefined;
        };

        const normalizeRelationRole = (role) => String(role ?? "").trim();

        const applySelectedRelationRoles = (relation) => {
            relation.side1.role = normalizeRelationRole(
                getSelectedRoleForSide("side1"),
            );
            relation.side2.role = normalizeRelationRole(
                getSelectedRoleForSide("side2"),
            );

            if (selectedArityIsTernary) {
                relation.side3.role = normalizeRelationRole(
                    getSelectedRoleForSide("side3"),
                );
            }
        };

        const handleAccept = () => {
            const source = selected;
            const relation = findRelationById(diagramRef.current, source.id);

            if (!relation) return;

            if (
                !side1?.idMx ||
                !side2?.idMx ||
                (selectedArityIsTernary && !side3?.idMx)
            ) {
                return;
            }

            if (isIdentifyingRelation(relation)) {
                clearIdentifyingRelationSemantics(relation.idMx);
            }

            const wasConfigured = isRelationConfigured(relation);

            if (wasConfigured) {
                removeExistingGraphCells(
                    graph,
                    getConfiguredRelationGraphCells({ relation, accessCell }),
                );

                removeRelationAttributes(relation);
            }

            applySelectedRelationArity(relation);

            if (wasConfigured) {
                resetRelationSides(relation, { cardinality: "X:X" });
            }

            applySelectedRelationRoles(relation);

            connectRelationGraphSides({
                graph,
                relationCell: source,
                relation,
                side1EntityCell: accessCell(side1.idMx),
                side2EntityCell: accessCell(side2.idMx),
                side3EntityCell: selectedArityIsTernary
                    ? accessCell(side3.idMx)
                    : null,
                cardinalityStyle: getCardinalityStyleString(),
                syncSelfRelationEdges,
                syncRepeatedParticipantRelationEdges,
            });

            syncAndPersistDiagramData();

            setOpen(false);
            setRelationArity(RELATION_ARITIES.BINARY);
            setSide1("");
            setSide2("");
            setSide3("");
            setSide1Role("");
            setSide2Role("");
            setSide3Role("");
        };

        const acceptDisabled =
            side1 === "" ||
            side2 === "" ||
            (selectedArityIsTernary && side3 === "");

        const handleChangeRelationArity = (event) => {
            const nextArity = Number(event.target.value);

            setRelationArity(nextArity);

            if (nextArity !== RELATION_ARITIES.TERNARY) {
                setSide3("");
                setSide1Role("");
                setSide2Role("");
                setSide3Role("");
            }
        };

        const handleChangeSide1 = (event) => {
            setSide1(event.target.value);
        };

        const handleChangeSide2 = (event) => {
            setSide2(event.target.value);
        };

        const handleChangeSide3 = (event) => {
            setSide3(event.target.value);
        };

        const handleChangeSide1Role = (event) => {
            setSide1Role(event.target.value);
        };

        const handleChangeSide2Role = (event) => {
            setSide2Role(event.target.value);
        };

        const handleChangeSide3Role = (event) => {
            setSide3Role(event.target.value);
        };

        if (isRelation) {
            return (
                <>
                    <SidebarActionButton onClick={handleClickOpen}>
                        {t("action.configureRelation")}
                    </SidebarActionButton>
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                        PaperComponent={DraggableDialogPaper}
                    >
                        <DialogTitle
                            id="alert-dialog-title"
                            className={DRAGGABLE_DIALOG_TITLE_CLASS}
                            sx={{ cursor: "move", userSelect: "none" }}
                        >
                            {t("relation.dialogTitle")}
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                {t("relation.dialogHelp")}
                            </DialogContentText>
                            {selectedArityIsTernary && (
                                <>
                                    <Box sx={{ minHeight: 10 }} />
                                    <DialogContentText>
                                        {t("relation.ternaryHelp")}
                                    </DialogContentText>
                                </>
                            )}
                            <Box sx={{ minHeight: 10 }} />
                            <Box sx={{ minWidth: 120 }}>
                                <FormControl fullWidth>
                                    <InputLabel id="relation-arity-label">
                                        {t("relation.arityLabel")}
                                    </InputLabel>
                                    <Select
                                        id="relation-arity"
                                        value={relationArity}
                                        label={t("relation.arityLabel")}
                                        onChange={handleChangeRelationArity}
                                    >
                                        <MenuItem
                                            value={RELATION_ARITIES.BINARY}
                                        >
                                            {t("relation.binary")}
                                        </MenuItem>
                                        <MenuItem
                                            value={RELATION_ARITIES.TERNARY}
                                        >
                                            {t("relation.ternary")}
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                                <Box sx={{ minHeight: 10 }} />
                                <FormControl fullWidth>
                                    <InputLabel id="side1-label">
                                        {t("relation.side1")}
                                    </InputLabel>
                                    <Select
                                        id="side1"
                                        value={side1}
                                        label={t("relation.side1")}
                                        onChange={handleChangeSide1}
                                    >
                                        {diagramRef.current.entities.map(
                                            (entity) => {
                                                return (
                                                    <MenuItem
                                                        key={entity.idMx}
                                                        value={entity}
                                                    >
                                                        {entity.name}
                                                    </MenuItem>
                                                );
                                            },
                                        )}
                                    </Select>
                                </FormControl>
                                {sideRequiresRole("side1") && (
                                    <>
                                        <Box sx={{ minHeight: 10 }} />
                                        <TextField
                                            id="side1-role"
                                            label={t("relation.sideRole", {
                                                side: 1,
                                            })}
                                            value={side1Role}
                                            onChange={handleChangeSide1Role}
                                            fullWidth
                                        />
                                    </>
                                )}
                                <Box sx={{ minHeight: 10 }} />
                                <FormControl fullWidth>
                                    <InputLabel id="side2-label">
                                        {t("relation.side2")}
                                    </InputLabel>
                                    <Select
                                        id="side2"
                                        value={side2}
                                        label={t("relation.side2")}
                                        onChange={handleChangeSide2}
                                    >
                                        {diagramRef.current.entities.map(
                                            (entity) => {
                                                return (
                                                    <MenuItem
                                                        key={entity.idMx}
                                                        value={entity}
                                                    >
                                                        {entity.name}
                                                    </MenuItem>
                                                );
                                            },
                                        )}
                                    </Select>
                                </FormControl>
                                {sideRequiresRole("side2") && (
                                    <>
                                        <Box sx={{ minHeight: 10 }} />
                                        <TextField
                                            id="side2-role"
                                            label={t("relation.sideRole", {
                                                side: 2,
                                            })}
                                            value={side2Role}
                                            onChange={handleChangeSide2Role}
                                            fullWidth
                                        />
                                    </>
                                )}
                                {selectedArityIsTernary && (
                                    <>
                                        <Box sx={{ minHeight: 10 }} />
                                        <FormControl fullWidth>
                                            <InputLabel id="side3-label">
                                                {t("relation.side3")}
                                            </InputLabel>
                                            <Select
                                                id="side3"
                                                value={side3}
                                                label={t("relation.side3")}
                                                onChange={handleChangeSide3}
                                            >
                                                {diagramRef.current.entities.map(
                                                    (entity) => {
                                                        return (
                                                            <MenuItem
                                                                key={
                                                                    entity.idMx
                                                                }
                                                                value={entity}
                                                            >
                                                                {entity.name}
                                                            </MenuItem>
                                                        );
                                                    },
                                                )}
                                            </Select>
                                        </FormControl>
                                        {sideRequiresRole("side3") && (
                                            <>
                                                <Box sx={{ minHeight: 10 }} />
                                                <TextField
                                                    id="side3-role"
                                                    label={t(
                                                        "relation.sideRole",
                                                        { side: 3 },
                                                    )}
                                                    value={side3Role}
                                                    onChange={
                                                        handleChangeSide3Role
                                                    }
                                                    fullWidth
                                                />
                                            </>
                                        )}
                                    </>
                                )}
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleClose}>
                                {t("common.cancel")}
                            </Button>
                            <Button
                                onClick={handleAccept}
                                autoFocus
                                disabled={acceptDisabled}
                            >
                                {t("common.accept")}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            );
        }
    };

    const RelationRolesButton = () => {
        const isRelation = isRelationShapeCell(selected);
        const selectedRelationDiag = getSelectedRelationData();

        const [open, setOpen] = React.useState(false);
        const [roles, setRoles] = React.useState({
            side1: "",
            side2: "",
            side3: "",
        });

        const canEditRoles =
            isRelation &&
            selectedRelationDiag &&
            isTernaryRelation(selectedRelationDiag) &&
            isRelationConfigured(selectedRelationDiag);

        const normalizeRole = (role) => String(role ?? "").trim();

        const getSideKeys = (relation) =>
            relation ? getRelationSideKeys(relation) : [];

        const getSideEntityName = (relation, sideKey) => {
            const entityId = relation?.[sideKey]?.entity?.idMx;
            const entityCell = accessCell(entityId);
            const entityData = findEntityById(diagramRef.current, entityId);

            return entityCell?.value ?? entityData?.name ?? "";
        };

        const getSideLabel = (relation, sideKey) => {
            const sideNumber = sideKey.replace("side", "");
            const entityName = getSideEntityName(relation, sideKey);

            return entityName
                ? t("roles.sideLabelWithEntity", {
                      side: sideNumber,
                      entity: entityName,
                  })
                : t("roles.sideLabel", {
                      side: sideNumber,
                  });
        };

        const getRepeatedParticipantSideGroups = (relation) => {
            const groupsByEntityId = {};

            getSideKeys(relation).forEach((sideKey) => {
                const entityId = relation?.[sideKey]?.entity?.idMx;

                if (!entityId) {
                    return;
                }

                groupsByEntityId[entityId] = [
                    ...(groupsByEntityId[entityId] ?? []),
                    sideKey,
                ];
            });

            return Object.values(groupsByEntityId).filter(
                (sideGroup) => sideGroup.length > 1,
            );
        };

        const repeatedParticipantRolesAreValid = (relation) =>
            getRepeatedParticipantSideGroups(relation).every((sideGroup) => {
                const groupRoles = sideGroup.map((sideKey) =>
                    normalizeRole(roles[sideKey]),
                );

                return (
                    groupRoles.every(Boolean) &&
                    new Set(groupRoles).size === groupRoles.length
                );
            });

        const handleClickOpen = () => {
            const relation = getSelectedRelationData();

            setRoles({
                side1: relation?.side1?.role ?? "",
                side2: relation?.side2?.role ?? "",
                side3: relation?.side3?.role ?? "",
            });

            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleChangeRole = (sideKey) => (event) => {
            setRoles((previousRoles) => ({
                ...previousRoles,
                [sideKey]: event.target.value,
            }));
        };

        const handleAccept = () => {
            const relation = getSelectedRelationData();

            if (!relation) {
                return;
            }

            getSideKeys(relation).forEach((sideKey) => {
                relation[sideKey].role = normalizeRole(roles[sideKey]);
            });

            syncRelationCardinalityLabels(relation);
            refreshGraph();
            syncAndPersistDiagramData();

            setOpen(false);

            toast.success(t("feedback.relationRolesUpdated"));
        };

        if (!canEditRoles) {
            return;
        }

        const sideKeys = getSideKeys(selectedRelationDiag);
        const acceptDisabled =
            !repeatedParticipantRolesAreValid(selectedRelationDiag);

        return (
            <>
                <SidebarActionButton onClick={handleClickOpen}>
                    {t("action.editRoles")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="relation-roles-dialog-title"
                    aria-describedby="relation-roles-dialog-description"
                    PaperComponent={DraggableDialogPaper}
                >
                    <DialogTitle
                        id="relation-roles-dialog-title"
                        className={DRAGGABLE_DIALOG_TITLE_CLASS}
                        sx={{ cursor: "move", userSelect: "none" }}
                    >
                        {t("roles.dialogTitle")}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="relation-roles-dialog-description">
                            {t("roles.dialogHelp")}
                        </DialogContentText>
                        <Box sx={{ minHeight: 10 }} />
                        <Box sx={{ minWidth: 320 }}>
                            {sideKeys.map((sideKey) => (
                                <React.Fragment key={sideKey}>
                                    <TextField
                                        id={`relation-role-${sideKey}`}
                                        label={getSideLabel(
                                            selectedRelationDiag,
                                            sideKey,
                                        )}
                                        value={roles[sideKey] ?? ""}
                                        onChange={handleChangeRole(sideKey)}
                                        fullWidth
                                    />
                                    <Box sx={{ minHeight: 10 }} />
                                </React.Fragment>
                            ))}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleAccept}
                            autoFocus
                            disabled={acceptDisabled}
                        >
                            {t("common.accept")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const IsaConfigurationButton = () => {
        const isIsa = isIsaShapeCell(selected);
        const [open, setOpen] = React.useState(false);
        const [generalizationId, setGeneralizationId] = React.useState("");
        const [specializationIds, setSpecializationIds] = React.useState([]);

        const getEntityNameById = (entityId) =>
            findEntityById(diagramRef.current, entityId)?.name ?? entityId;

        const handleClickOpen = () => {
            const isa = getSelectedIsaData();

            setGeneralizationId(isa?.generalization?.entity?.idMx ?? "");
            setSpecializationIds(
                (isa?.specializations ?? [])
                    .map((specialization) => specialization?.entity?.idMx)
                    .filter(Boolean),
            );
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleChangeGeneralization = (event) => {
            const nextGeneralizationId = event.target.value;

            setGeneralizationId(nextGeneralizationId);
            setSpecializationIds((currentSpecializationIds) =>
                currentSpecializationIds.filter(
                    (entityId) => entityId !== nextGeneralizationId,
                ),
            );
        };

        const handleChangeSpecializations = (event) => {
            const value = event.target.value;

            setSpecializationIds(
                typeof value === "string" ? value.split(",") : value,
            );
        };

        const handleAccept = () => {
            const configured = configureIsaHierarchy({
                generalizationId,
                specializationIds,
            });

            if (configured) {
                setOpen(false);
            }
        };

        const acceptDisabled =
            generalizationId === "" ||
            specializationIds.length === 0 ||
            specializationIds.includes(generalizationId);

        if (!isIsa) {
            return;
        }

        return (
            <>
                <SidebarActionButton onClick={handleClickOpen}>
                    {t("action.configureIsa")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    PaperComponent={DraggableDialogPaper}
                >
                    <DialogTitle
                        className={DRAGGABLE_DIALOG_TITLE_CLASS}
                        sx={{ cursor: "move", userSelect: "none" }}
                    >
                        {t("isa.dialogTitle")}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {t("isa.dialogHelp")}
                        </DialogContentText>
                        <Box sx={{ minHeight: 10 }} />
                        <Box sx={{ minWidth: 260 }}>
                            <FormControl fullWidth>
                                <InputLabel id="isa-generalization-label">
                                    {t("isa.generalization")}
                                </InputLabel>
                                <Select
                                    id="isa-generalization"
                                    value={generalizationId}
                                    label={t("isa.generalization")}
                                    onChange={handleChangeGeneralization}
                                >
                                    {diagramRef.current.entities.map(
                                        (entity) => (
                                            <MenuItem
                                                key={entity.idMx}
                                                value={entity.idMx}
                                            >
                                                {entity.name}
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>
                            </FormControl>

                            <Box sx={{ minHeight: 10 }} />

                            <FormControl fullWidth>
                                <InputLabel id="isa-specializations-label">
                                    {t("isa.specializations")}
                                </InputLabel>
                                <Select
                                    id="isa-specializations"
                                    multiple
                                    value={specializationIds}
                                    label={t("isa.specializations")}
                                    onChange={handleChangeSpecializations}
                                    renderValue={(selectedIds) =>
                                        selectedIds
                                            .map(getEntityNameById)
                                            .join(", ")
                                    }
                                >
                                    {diagramRef.current.entities
                                        .filter(
                                            (entity) =>
                                                entity.idMx !==
                                                generalizationId,
                                        )
                                        .map((entity) => (
                                            <MenuItem
                                                key={entity.idMx}
                                                value={entity.idMx}
                                            >
                                                {entity.name}
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleAccept}
                            autoFocus
                            disabled={acceptDisabled}
                        >
                            {t("common.accept")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };
    const RelationCardinalitiesButton = () => {
        const isRelation = isRelationShapeCell(selected);
        const selectedDiag = findRelationById(diagramRef.current, selected?.id);
        const [open, setOpen] = React.useState(false);
        const [cardinalities, setCardinalities] = React.useState({
            side1: "",
            side2: "",
            side3: "",
        });

        const sideKeys = getRelationSideKeys(selectedDiag);

        const getCardinalityForSide = (sideKey) => cardinalities[sideKey] ?? "";

        const resetCardinalities = () => {
            setCardinalities({
                side1: "",
                side2: "",
                side3: "",
            });
        };

        const handleClickOpen = () => {
            const nextCardinalities = sideKeys.reduce((result, sideKey) => {
                result[sideKey] = selectedDiag?.[sideKey]?.cardinality ?? "";

                return result;
            }, {});

            setCardinalities(nextCardinalities);
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = () => {
            if (
                isIdentifyingRelation(selectedDiag) &&
                !side1IsWeak &&
                !side2IsWeak
            ) {
                toast.error(t("feedback.identifyingRelationSidesNotResolved"));
                return;
            }

            if (isIdentifyingRelation(selectedDiag)) {
                if (side1IsWeak) {
                    selectedDiag.side1.cardinality =
                        getCardinalityForSide("side1");
                    selectedDiag.side2.cardinality = "1:1";
                } else {
                    selectedDiag.side1.cardinality = "1:1";
                    selectedDiag.side2.cardinality =
                        getCardinalityForSide("side2");
                }

                removeRelationAttributes(selectedDiag);
            } else {
                sideKeys.forEach((sideKey) => {
                    selectedDiag[sideKey].cardinality =
                        getCardinalityForSide(sideKey);
                });

                if (canRelationTypeHoldAttributes(selectedDiag)) {
                    selectedDiag.canHoldAttributes = true;
                } else {
                    removeRelationAttributes(selectedDiag);
                }
            }

            syncRelationCardinalityLabels(selectedDiag);
            refreshGraph();

            resetCardinalities();
            setOpen(false);
            syncAndPersistDiagramData();
        };

        const handleChangeCardinality = (sideKey) => (event) => {
            setCardinalities((currentCardinalities) => ({
                ...currentCardinalities,
                [sideKey]: event.target.value,
            }));
        };

        const { weakSide, strongSide } = getWeakAndStrongSidesForRelation(
            diagramRef.current,
            selectedDiag,
        );

        const side1IsWeak =
            isIdentifyingRelation(selectedDiag) &&
            weakSide?.entity?.idMx === selectedDiag?.side1?.entity?.idMx;

        const side2IsWeak =
            isIdentifyingRelation(selectedDiag) &&
            weakSide?.entity?.idMx === selectedDiag?.side2?.entity?.idMx;

        const side1IsStrong =
            isIdentifyingRelation(selectedDiag) &&
            strongSide?.entity?.idMx === selectedDiag?.side1?.entity?.idMx;

        const side2IsStrong =
            isIdentifyingRelation(selectedDiag) &&
            strongSide?.entity?.idMx === selectedDiag?.side2?.entity?.idMx;

        const getSideIsWeak = (sideKey) => {
            if (sideKey === "side1") return side1IsWeak;
            if (sideKey === "side2") return side2IsWeak;

            return false;
        };

        const getSideIsStrong = (sideKey) => {
            if (sideKey === "side1") return side1IsStrong;
            if (sideKey === "side2") return side2IsStrong;

            return false;
        };

        const getAllowedCardinalitiesForSide = (sideKey) => {
            if (isTernaryRelation(selectedDiag)) {
                return TERNARY_RELATION_CARDINALITIES;
            }

            if (!isIdentifyingRelation(selectedDiag)) {
                return POSSIBLE_CARDINALITIES;
            }

            if (getSideIsWeak(sideKey)) {
                return IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITIES;
            }

            return [IDENTIFYING_RELATION_STRONG_SIDE_CARDINALITY];
        };

        const getCardinalityDisplayValue = (cardinality) =>
            getRelationCardinalityDisplayValue(selectedDiag, cardinality);

        const cardinalitySelectIdsBySideKey = {
            side1: "side1-to-side2",
            side2: "side2-to-side1",
            side3: "side3-cardinality",
        };

        const getSideEntityName = (sideKey) =>
            getRelationSideDisplayName({
                relation: selectedDiag,
                sideKey,
                entityName:
                    accessCell(selectedDiag?.[sideKey]?.entity?.idMx)?.value ??
                    "",
            });

        const cardinalityIsAllowedForSide = (sideKey) => {
            const cardinality = getCardinalityForSide(sideKey);

            if (cardinality === "") {
                return false;
            }

            if (isTernaryRelation(selectedDiag)) {
                return TERNARY_RELATION_CARDINALITIES.includes(cardinality);
            }

            return true;
        };

        const acceptDisabled = sideKeys.some(
            (sideKey) => !cardinalityIsAllowedForSide(sideKey),
        );

        if (isRelation) {
            const isConfigured = isRelationConfigured(selectedDiag);

            return (
                <>
                    <SidebarActionButton onClick={handleClickOpen}>
                        {t("action.configureCardinalities")}
                    </SidebarActionButton>
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                        PaperComponent={DraggableDialogPaper}
                    >
                        <DialogTitle
                            id="alert-dialog-title"
                            className={DRAGGABLE_DIALOG_TITLE_CLASS}
                            sx={{ cursor: "move", userSelect: "none" }}
                        >
                            {t("cardinalities.dialogTitle")}
                        </DialogTitle>
                        {!isConfigured && (
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                    {isIdentifyingRelation(selectedDiag)
                                        ? t("cardinalities.identifyingHelp")
                                        : t("cardinalities.dialogHelp")}
                                </DialogContentText>
                            </DialogContent>
                        )}
                        {isConfigured && (
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                    {isIdentifyingRelation(selectedDiag)
                                        ? t("cardinalities.identifyingHelp")
                                        : t("cardinalities.dialogHelp")}
                                </DialogContentText>
                                <Box sx={{ minHeight: 10 }} />
                                <Box sx={{ minWidth: 120 }}>
                                    {sideKeys.map((sideKey) => {
                                        const sideEntityName =
                                            getSideEntityName(sideKey);
                                        const selectId =
                                            cardinalitySelectIdsBySideKey[
                                                sideKey
                                            ];

                                        return (
                                            <React.Fragment key={sideKey}>
                                                <FormControl fullWidth>
                                                    <InputLabel
                                                        id={`${selectId}-label`}
                                                    >
                                                        {sideEntityName}
                                                    </InputLabel>
                                                    <Select
                                                        id={selectId}
                                                        value={getCardinalityForSide(
                                                            sideKey,
                                                        )}
                                                        label={sideEntityName}
                                                        onChange={handleChangeCardinality(
                                                            sideKey,
                                                        )}
                                                        disabled={
                                                            isIdentifyingRelation(
                                                                selectedDiag,
                                                            ) &&
                                                            getSideIsStrong(
                                                                sideKey,
                                                            )
                                                        }
                                                    >
                                                        {getAllowedCardinalitiesForSide(
                                                            sideKey,
                                                        ).map((cardinality) => (
                                                            <MenuItem
                                                                key={
                                                                    cardinality
                                                                }
                                                                value={
                                                                    cardinality
                                                                }
                                                            >
                                                                {getCardinalityDisplayValue(
                                                                    cardinality,
                                                                )}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <Box sx={{ minHeight: 10 }} />
                                            </React.Fragment>
                                        );
                                    })}
                                </Box>
                            </DialogContent>
                        )}
                        <DialogActions>
                            <Button onClick={handleClose}>
                                {t("common.cancel")}
                            </Button>
                            <Button
                                onClick={handleAccept}
                                autoFocus
                                disabled={acceptDisabled}
                            >
                                {t("common.accept")}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            );
        }
    };

    const getSelectedDiagramCells = () => {
        const selectionCells =
            typeof graph?.getSelectionCells === "function"
                ? graph.getSelectionCells()
                : [];

        const cells =
            selectionCells.length > 1
                ? selectionCells
                : [...selectionCells, selected].filter(Boolean);

        return Array.from(
            new Map(
                cells
                    .filter(Boolean)
                    .filter((cell) => typeof cell.id === "string")
                    .map((cell) => [cell.id, cell]),
            ).values(),
        );
    };

    const deleteEntityCell = (cell, { syncAfterDelete = true } = {}) => {
        const isEntity =
            isEntityShapeCell(cell) && !isWeakEntityDecoratorCell(cell);

        if (!isEntity) {
            return false;
        }

        const entityIndex = findEntityIndexById(diagramRef.current, cell.id);

        if (entityIndex === -1) {
            if (syncAfterDelete) {
                syncAndPersistDiagramData();
            }

            return false;
        }

        const entity = diagramRef.current.entities[entityIndex];

        diagramRef.current.entities.splice(entityIndex, 1);

        removeEntityGraphCells({
            graph,
            entity,
            accessCell,
            getAttributesCells,
            getWeakEntityDecoratorId,
            isWeakEntity,
        });

        diagramRef.current.relations
            .filter((relation) => relationInvolvesEntity(relation, entity.idMx))
            .forEach(removeRelationConfiguration);

        (diagramRef.current.isas ?? [])
            .filter((isa) => isaInvolvesEntity(isa, entity.idMx))
            .forEach(removeIsaConfiguration);

        if (syncAfterDelete) {
            syncAndPersistDiagramData();
        }

        return true;
    };

    const deleteSelectedEntity = () => deleteEntityCell(selected);

    const deleteAttributeCell = (cell, { syncAfterDelete = true } = {}) => {
        if (!isAttributeShapeCell(cell)) {
            return false;
        }

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            cell.id,
        );

        if (!attributeOwner) {
            return false;
        }

        const isKey = isPrimaryKeyAttribute(attributeOwner?.attribute);
        const isFromRelation = isRelationAttributeOwner(attributeOwner);
        const canDeleteAttribute = isFromRelation || !isKey;

        if (!canDeleteAttribute) {
            return false;
        }

        const { owner } = attributeOwner;
        const parentAttribute = attributeOwner.parent;

        const {
            removedAttribute,
            removedCompositeAttribute,
            promotedAttribute,
        } = removeAttributeFromOwnerTreeByIdWithPromotion(owner, cell.id);

        if (!removedAttribute) {
            return false;
        }

        removeAttributesCells(
            [removedAttribute, removedCompositeAttribute].filter(Boolean),
        );

        reparentAttributeCellToCurrentOwner({
            attribute: promotedAttribute,
            attributeOwner: promotedAttribute
                ? findAttributeTreeOwnerById(
                      diagramRef.current,
                      promotedAttribute.idMx,
                  )
                : null,
        });

        if (!promotedAttribute && parentAttribute) {
            syncAttributeVisualRepresentation(parentAttribute);
        }

        if (syncAfterDelete) {
            refreshGraph();
            syncAndPersistDiagramData();
        }

        return true;
    };

    const deleteSelectedAttribute = () => deleteAttributeCell(selected);

    const deleteRelationCell = (cell, { syncAfterDelete = true } = {}) => {
        if (!isRelationShapeCell(cell)) {
            return false;
        }

        const relationIndex = findRelationIndexById(
            diagramRef.current,
            cell.id,
        );

        if (relationIndex === -1) {
            if (syncAfterDelete) {
                syncAndPersistDiagramData();
            }

            return false;
        }

        const relation = diagramRef.current.relations[relationIndex];

        clearIdentifyingRelationSemantics(relation.idMx);

        diagramRef.current.relations.splice(relationIndex, 1);

        removeRelationGraphCells({
            graph,
            relation,
            accessCell,
            getAttributesCells,
        });

        if (syncAfterDelete) {
            syncAndPersistDiagramData();
        }

        return true;
    };

    const deleteSelectedRelation = () => deleteRelationCell(selected);

    const deleteIsaCell = (cell, { syncAfterDelete = true } = {}) => {
        if (!isIsaShapeCell(cell)) {
            return false;
        }

        const isaIndex = findIsaIndexById(diagramRef.current, cell.id);

        if (isaIndex === -1) {
            if (syncAfterDelete) {
                syncAndPersistDiagramData();
            }

            return false;
        }

        const isa = diagramRef.current.isas[isaIndex];

        diagramRef.current.isas.splice(isaIndex, 1);

        removeIsaGraphCells({
            graph,
            isa,
            accessCell,
        });

        if (syncAfterDelete) {
            syncAndPersistDiagramData();
        }

        return true;
    };

    const deleteSelectedIsa = () => deleteIsaCell(selected);

    const deleteDiagramElementCell = (
        cell,
        { syncAfterDelete = true } = {},
    ) => {
        if (!cell) {
            return false;
        }

        if (isEntityShapeCell(cell) && !isWeakEntityDecoratorCell(cell)) {
            return deleteEntityCell(cell, { syncAfterDelete });
        }

        if (isRelationShapeCell(cell)) {
            return deleteRelationCell(cell, { syncAfterDelete });
        }

        if (isAttributeShapeCell(cell)) {
            return deleteAttributeCell(cell, { syncAfterDelete });
        }

        if (isIsaShapeCell(cell)) {
            return deleteIsaCell(cell, { syncAfterDelete });
        }

        return false;
    };

    const getCellDeletionPriority = (cell) => {
        if (isRelationShapeCell(cell)) return 1;
        if (isIsaShapeCell(cell)) return 2;

        if (isEntityShapeCell(cell) && !isWeakEntityDecoratorCell(cell)) {
            return 3;
        }

        if (isAttributeShapeCell(cell)) return 4;

        return 5;
    };

    const deleteSelectedDiagramElements = () => {
        if (!graph) {
            return false;
        }

        const cells = getSelectedDiagramCells()
            .filter((cell) => getCellDeletionPriority(cell) < 5)
            .sort(
                (cellA, cellB) =>
                    getCellDeletionPriority(cellA) -
                    getCellDeletionPriority(cellB),
            );

        if (cells.length <= 1) {
            return deleteSelectedDiagramElement();
        }

        let deleted = false;

        cells.forEach((cell) => {
            deleted =
                deleteDiagramElementCell(cell, {
                    syncAfterDelete: false,
                }) || deleted;
        });

        if (!deleted) {
            return false;
        }

        if (typeof graph.clearSelection === "function") {
            graph.clearSelection();
        }

        setSelected(null);
        setSelectionVersion((prevVersion) => prevVersion + 1);

        refreshGraph();
        syncAndPersistDiagramData();

        return true;
    };

    const deleteSelectedDiagramElement = () => {
        if (!selected) {
            return false;
        }

        return deleteDiagramElementCell(selected);
    };

    const DeleteEntityButton = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);

        if (!isEntity) {
            return;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
    };

    const DeleteAttributeButton = () => {
        const isAttribute = isAttributeShapeCell(selected);

        if (!isAttribute) {
            return;
        }

        const selectedAttributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected?.id,
        );

        if (!selectedAttributeOwner) {
            return;
        }

        const isKey = isPrimaryKeyAttribute(selectedAttributeOwner?.attribute);
        const isFromRelation = isRelationAttributeOwner(selectedAttributeOwner);
        const canDeleteAttribute = isFromRelation || !isKey;

        if (!canDeleteAttribute) {
            return;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
    };

    const DeleteRelationButton = () => {
        const isRelation = isRelationShapeCell(selected);

        if (!isRelation) {
            return;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
    };

    const DeleteIsaButton = () => {
        const isIsa = isIsaShapeCell(selected);

        if (!isIsa) {
            return;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
    };

    const DeleteMultipleSelectionButton = () => {
        if (!hasMultipleSelectedCells) {
            return;
        }

        return (
            <SidebarActionButton
                className="button-toolbar-action-danger"
                onClick={deleteSelectedDiagramElements}
            >
                {t("action.delete")}
            </SidebarActionButton>
        );
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

    const UndoRedoButtons = () => (
        <>
            <SidebarActionButton
                onClick={undoDiagramChange}
                disabled={!canUndo}
                tooltip={getActionTooltip(t("action.undo"), "Ctrl+Z")}
            >
                {t("action.undo")}
            </SidebarActionButton>
            <SidebarActionButton
                onClick={redoDiagramChange}
                disabled={!canRedo}
                tooltip={getActionTooltip(
                    t("action.redo"),
                    "Ctrl+Y / Ctrl+Shift+Z",
                )}
            >
                {t("action.redo")}
            </SidebarActionButton>
        </>
    );

    const ValidateDiagramButton = () => {
        const [open, setOpen] = React.useState(false);
        const [validationMessages, setValidationMessages] = React.useState([]);

        const handleClickOpen = () => {
            setRefreshDiagram((prevState) => !prevState);

            const diagnostics = validateGraph(diagramRef.current);

            if (diagnostics.isValid) {
                setValidationMessages([]);
                setOpen(false);
                toast.success(t("validation.context.diagram.success"));
                return;
            }

            setValidationMessages(
                getValidationDialogMessages(
                    diagnostics,
                    "diagram",
                    diagramRef.current,
                    t,
                ),
            );
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        return (
            <>
                <SidebarActionButton
                    onClick={handleClickOpen}
                    tooltip={t("diagram.validateTitle")}
                >
                    {t("diagram.validate")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="validate-diagram-dialog-title"
                >
                    <DialogTitle id="validate-diagram-dialog-title">
                        {t("diagram.validateTitle")}
                    </DialogTitle>
                    <DialogContent>
                        {validationMessages.map(
                            renderLocalizedValidationDialogMessage,
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.close")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const FitToDiagramButton = () => {
        const hasDiagramElements =
            (diagramRef.current.entities?.length ?? 0) > 0 ||
            (diagramRef.current.relations?.length ?? 0) > 0 ||
            (diagramRef.current.isas?.length ?? 0) > 0;

        const handleClick = () => {
            if (!hasDiagramElements) {
                toast(t("feedback.diagramFitViewEmpty"));
                return;
            }

            const fitted = fitGraphToDiagram(graph);

            if (!fitted) {
                toast.error(t("feedback.diagramFitViewFailed"));
                return;
            }

            toast.success(t("feedback.diagramViewFitted"));
        };

        return (
            <SidebarActionButton
                onClick={handleClick}
                tooltip={t("diagram.fitViewTitle")}
            >
                {t("diagram.fitView")}
            </SidebarActionButton>
        );
    };

    const GenerateSQLButton = () => {
        const [open, setOpen] = React.useState(false);
        const [acceptDisabled, setAcceptDisabled] = React.useState(true);
        const [validationMessages, setValidationMessages] = React.useState([]);

        const handleClickOpen = () => {
            setRefreshDiagram((prevState) => !prevState);

            const diagnostics = validateGraph(diagramRef.current);

            setAcceptDisabled(!diagnostics.isValid);
            setValidationMessages(
                getValidationDialogMessages(
                    diagnostics,
                    "sql",
                    diagramRef.current,
                    t,
                ),
            );
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = async () => {
            setOpen(false);

            const sqlScript = generateSQL(diagramRef.current);

            const result = await exportSqlScriptToFile(sqlScript);

            showSaveFileResultToast(result);
        };

        return (
            <>
                <SidebarActionButton
                    onClick={handleClickOpen}
                    tooltip={t("diagram.generateSqlTitle")}
                >
                    {t("diagram.generateSql")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {t("diagram.generateSqlTitle")}
                    </DialogTitle>
                    <DialogContent>
                        {validationMessages.map(
                            renderLocalizedValidationDialogMessage,
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {acceptDisabled
                                ? t("common.close")
                                : t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleAccept}
                            autoFocus
                            disabled={acceptDisabled}
                        >
                            {t("diagram.generateSql")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const ExportJSONButton = () => {
        const [open, setOpen] = React.useState(false);
        const [acceptDisabled, setAcceptDisabled] = React.useState(true);
        const [validationMessages, setValidationMessages] = React.useState([]);

        const handleClickOpen = () => {
            setRefreshDiagram((prevState) => !prevState);
            const diagnostics = validateGraph(diagramRef.current);

            setAcceptDisabled(!diagnostics.isValid);
            setValidationMessages(
                getValidationDialogMessages(
                    diagnostics,
                    "exportJson",
                    diagramRef.current,
                    t,
                ),
            );
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = async () => {
            setOpen(false);

            const result = await exportDiagramToJsonFile(diagramRef.current);

            showSaveFileResultToast(result);
        };

        return (
            <>
                <SidebarActionButton
                    onClick={handleClickOpen}
                    tooltip={t("diagram.exportJsonTitle")}
                >
                    {t("diagram.exportJson")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {t("diagram.exportJsonTitle")}
                    </DialogTitle>
                    <DialogContent>
                        {validationMessages.map(
                            renderLocalizedValidationDialogMessage,
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {acceptDisabled
                                ? t("common.close")
                                : t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleAccept}
                            autoFocus
                            disabled={acceptDisabled}
                        >
                            {t("diagram.exportJson")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const ExportImageButton = () => {
        const [open, setOpen] = React.useState(false);
        const [selectedFormat, setSelectedFormat] = React.useState(
            DIAGRAM_IMAGE_EXPORT_FORMATS.PNG,
        );

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleFormatChange = (event) => {
            setSelectedFormat(event.target.value);
        };

        const handleAccept = async () => {
            if (isDiagramEmpty) {
                toast.error(t("feedback.diagramImageExportEmpty"));
                setOpen(false);
                return;
            }

            if (typeof graph?.clearSelection === "function") {
                graph.clearSelection();
            }

            setSelected(null);
            setSelectionVersion((prevVersion) => prevVersion + 1);

            setOpen(false);

            const result = await exportDiagramImageToFile(
                graph,
                selectedFormat,
            );

            showSaveFileResultToast(result);
        };

        return (
            <>
                <SidebarActionButton
                    onClick={handleClickOpen}
                    tooltip={t("diagram.exportImageTitle")}
                >
                    {t("diagram.exportImage")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="export-image-dialog-title"
                    aria-describedby="export-image-dialog-description"
                >
                    <DialogTitle id="export-image-dialog-title">
                        {t("diagram.exportImageTitle")}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="export-image-dialog-description">
                            {t("diagram.exportImageHelp")}
                        </DialogContentText>

                        <FormControl fullWidth margin="normal" size="small">
                            <InputLabel id="export-image-format-label">
                                {t("diagram.exportImageFormatLabel")}
                            </InputLabel>
                            <Select
                                labelId="export-image-format-label"
                                id="export-image-format"
                                value={selectedFormat}
                                label={t("diagram.exportImageFormatLabel")}
                                onChange={handleFormatChange}
                            >
                                <MenuItem
                                    value={DIAGRAM_IMAGE_EXPORT_FORMATS.PNG}
                                >
                                    {t("diagram.exportImageFormatPng")}
                                </MenuItem>
                                <MenuItem
                                    value={DIAGRAM_IMAGE_EXPORT_FORMATS.SVG}
                                >
                                    {t("diagram.exportImageFormatSvg")}
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleAccept} autoFocus>
                            {t("diagram.exportImage")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const ImportJSONButton = () => {
        const [open, setOpen] = React.useState(false);
        const [validationMessages, setValidationMessages] = React.useState([]);
        const [selectedImportMode, setSelectedImportMode] = React.useState(
            DIAGRAM_COMPOSITION_MODES.REPLACE,
        );

        const handleClickOpen = () => {
            setValidationMessages([]);
            setSelectedImportMode(DIAGRAM_COMPOSITION_MODES.REPLACE);
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleImportModeChange = (event) => {
            setSelectedImportMode(event.target.value);
        };

        const handleFileChange = async (event) => {
            const file = event.target.files[0];

            if (!file) return;

            try {
                const importedDiagram = await readDiagramJsonFile(file);
                const composedDiagram = composeDiagramWithCurrent({
                    incomingDiagram: importedDiagram,
                    mode: selectedImportMode,
                });
                const diagnostics = validateGraph(composedDiagram);

                setValidationMessages(
                    getValidationDialogMessages(
                        diagnostics,
                        "importJson",
                        composedDiagram,
                        t,
                    ),
                );

                if (diagnostics.isValid) {
                    applyDiagramData(composedDiagram);

                    setOpen(false);
                    toast.success(t("feedback.diagramImported"));
                } else {
                    toast.error(t("feedback.diagramImportInvalid"));
                }
            } catch (error) {
                setValidationMessages([t("feedback.diagramImportInvalidJson")]);
                toast.error(t("feedback.diagramImportFailed"));
            } finally {
                event.target.value = "";
            }
        };

        return (
            <>
                <SidebarActionButton
                    onClick={handleClickOpen}
                    tooltip={t("diagram.importJsonTitle")}
                >
                    {t("diagram.importJson")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {t("diagram.importJsonTitle")}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {t("diagram.importJsonHelp")}
                        </DialogContentText>

                        <FormControl fullWidth margin="normal" size="small">
                            <InputLabel id="import-json-mode-label">
                                {t("diagramComposition.modeLabel")}
                            </InputLabel>
                            <Select
                                labelId="import-json-mode-label"
                                id="import-json-mode"
                                value={selectedImportMode}
                                label={t("diagramComposition.modeLabel")}
                                onChange={handleImportModeChange}
                            >
                                <MenuItem
                                    value={DIAGRAM_COMPOSITION_MODES.REPLACE}
                                >
                                    {t("diagramComposition.replace")}
                                </MenuItem>
                                <MenuItem
                                    value={DIAGRAM_COMPOSITION_MODES.MERGE}
                                >
                                    {t("diagramComposition.merge")}
                                </MenuItem>
                            </Select>
                        </FormControl>

                        {validationMessages.map(
                            renderLocalizedValidationDialogMessage,
                        )}

                        <input
                            type="file"
                            accept="application/json"
                            onChange={handleFileChange}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.close")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const ResetCanvasButton = () => {
        const [open, setOpen] = React.useState(false);

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = () => {
            resetCanvas({ recordHistory: true });

            setRefreshDiagram((prevState) => !prevState);
            setOpen(false);
        };

        return (
            <>
                <SidebarActionButton
                    className="button-toolbar-action-danger"
                    onClick={handleClickOpen}
                    tooltip={t("diagram.resetTitle")}
                >
                    {t("diagram.reset")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {t("diagram.resetTitle")}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            {t("diagram.resetHelp")}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleAccept} autoFocus>
                            {t("diagram.reset")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const GenerateStructureButton = () => {
        const [open, setOpen] = React.useState(false);
        const [selectedTemplateId, setSelectedTemplateId] = React.useState(
            GENERATE_STRUCTURE_TEMPLATES[0].id,
        );
        const [selectedCompositionMode, setSelectedCompositionMode] =
            React.useState(DIAGRAM_COMPOSITION_MODES.REPLACE);

        const selectedTemplate =
            getGenerateStructureTemplateById(selectedTemplateId);

        const getTemplateName = (template) =>
            t(`generateStructure.templates.${template.id}.name`);

        const getTemplateDescription = (template) =>
            t(`generateStructure.templates.${template.id}.description`);

        const selectedTemplateName = getTemplateName(selectedTemplate);

        const handleClickOpen = () => {
            setSelectedCompositionMode(DIAGRAM_COMPOSITION_MODES.REPLACE);
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleTemplateChange = (event) => {
            setSelectedTemplateId(event.target.value);
        };

        const handleCompositionModeChange = (event) => {
            setSelectedCompositionMode(event.target.value);
        };

        const handleAccept = () => {
            const exampleDiagram = selectedTemplate.createDiagram();
            const composedDiagram = composeDiagramWithCurrent({
                incomingDiagram: exampleDiagram,
                mode: selectedCompositionMode,
            });

            applyDiagramData(composedDiagram);

            setRefreshDiagram((prevState) => !prevState);
            setOpen(false);

            toast.success(
                t("generateStructure.success", {
                    name: selectedTemplateName,
                }),
            );
        };

        return (
            <>
                <SidebarActionButton
                    onClick={handleClickOpen}
                    tooltip={t("generateStructure.title")}
                >
                    {t("generateStructure.button")}
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="generate-structure-dialog-title"
                    aria-describedby="generate-structure-dialog-description"
                >
                    <DialogTitle id="generate-structure-dialog-title">
                        {t("generateStructure.title")}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="generate-structure-dialog-description">
                            {t("generateStructure.help")}
                        </DialogContentText>

                        <FormControl fullWidth margin="normal" size="small">
                            <InputLabel id="generate-structure-template-label">
                                {t("generateStructure.selectorLabel")}
                            </InputLabel>
                            <Select
                                labelId="generate-structure-template-label"
                                id="generate-structure-template"
                                value={selectedTemplateId}
                                label={t("generateStructure.selectorLabel")}
                                onChange={handleTemplateChange}
                            >
                                {GENERATE_STRUCTURE_TEMPLATES.map(
                                    (template) => (
                                        <MenuItem
                                            key={template.id}
                                            value={template.id}
                                        >
                                            {getTemplateName(template)}
                                        </MenuItem>
                                    ),
                                )}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="normal" size="small">
                            <InputLabel id="generate-structure-mode-label">
                                {t("diagramComposition.modeLabel")}
                            </InputLabel>
                            <Select
                                labelId="generate-structure-mode-label"
                                id="generate-structure-mode"
                                value={selectedCompositionMode}
                                label={t("diagramComposition.modeLabel")}
                                onChange={handleCompositionModeChange}
                            >
                                <MenuItem
                                    value={DIAGRAM_COMPOSITION_MODES.REPLACE}
                                >
                                    {t("diagramComposition.replace")}
                                </MenuItem>
                                <MenuItem
                                    value={DIAGRAM_COMPOSITION_MODES.MERGE}
                                >
                                    {t("diagramComposition.merge")}
                                </MenuItem>
                            </Select>
                        </FormControl>

                        <DialogContentText>
                            {getTemplateDescription(selectedTemplate)}
                        </DialogContentText>

                        <DialogContentText sx={{ mt: 2 }}>
                            {t("generateStructure.continueQuestion")}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleAccept} autoFocus>
                            {t("generateStructure.button")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const AppBranding = () => (
        <div className="sidebar-app-branding" aria-label={t("app.name")}>
            <img
                className="sidebar-app-branding-logo"
                src="images/ubu-logo.png"
                alt={t("app.logoAlt")}
            />
            <div className="sidebar-app-branding-text">
                <p className="sidebar-app-branding-name">{t("app.name")}</p>
            </div>
        </div>
    );

    const HelpButton = () => {
        const [open, setOpen] = React.useState(false);

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        return (
            <>
                <SidebarActionButton
                    className="button-toolbar-action-icon-only"
                    onClick={handleClickOpen}
                    tooltip={t("help.title")}
                    ariaLabel={t("help.button")}
                >
                    <SidebarActionIcon>?</SidebarActionIcon>
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="help-dialog-title"
                >
                    <DialogTitle id="help-dialog-title">
                        {t("help.title")}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("help.intro")}
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("help.createElements")}
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("help.contextualActions")}
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("help.validationAndSql")}
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("help.persistence")}
                        </DialogContentText>
                        <DialogContentText>
                            {t("help.isaScope")}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.close")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const AboutButton = () => {
        const [open, setOpen] = React.useState(false);

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        return (
            <>
                <SidebarActionButton
                    className="button-toolbar-action-icon-only"
                    onClick={handleClickOpen}
                    tooltip={t("about.title")}
                    ariaLabel={t("about.button")}
                >
                    <SidebarActionIcon>i</SidebarActionIcon>
                </SidebarActionButton>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="about-dialog-title"
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle id="about-dialog-title">
                        {t("about.title")}
                    </DialogTitle>
                    <DialogContent>
                        <Box className="about-dialog-branding">
                            <img
                                className="about-dialog-logo"
                                src="images/ubu-logo.png"
                                alt={t("app.logoAlt")}
                            />
                            <Box>
                                <DialogContentText
                                    sx={{ mb: 0, fontWeight: 600 }}
                                >
                                    {t("app.name")}
                                </DialogContentText>
                                <DialogContentText sx={{ mb: 0 }}>
                                    {t("app.institution")}
                                </DialogContentText>
                            </Box>
                        </Box>

                        <DialogContentText sx={{ mb: 1 }}>
                            {t("about.description")}
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("about.author")}
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("about.versionInfo", {
                                version: APP_VERSION,
                                date: BUILD_DATE,
                                commit: BUILD_COMMIT,
                            })}
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("about.currentWork")}
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("about.previousWork")}{" "}
                            <a
                                className="about-dialog-link"
                                href="https://github.com/rubenmate/draw-entity-relation"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t("about.previousWorkLink")}
                            </a>
                            .
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("about.technologies")}
                        </DialogContentText>
                        <DialogContentText sx={{ mb: 1 }}>
                            {t("about.license")}{" "}
                            <a
                                className="about-dialog-link"
                                href="https://github.com/jgraph/mxgraph/blob/master/LICENSE"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t("about.mxGraphLicenseLink")}
                            </a>
                            .
                        </DialogContentText>
                        <DialogContentText>
                            {t("about.ubuImage")}{" "}
                            <a
                                className="about-dialog-link"
                                href="https://www.ubu.es/servicio-de-publicaciones-e-imagen-institucional/imagen-institucional/imagen-corporativa-de-la-universidad-de-burgos"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t("about.ubuImageLink")}
                            </a>
                            .
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>
                            {t("common.close")}
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const LanguageSelector = () => {
        const languageOptions = [
            {
                code: "es",
                shortLabel: "ES",
                flagClass: "language-toggle-flag-es",
                labelKey: "language.optionSpanish",
            },
            {
                code: "en",
                shortLabel: "EN",
                flagClass: "language-toggle-flag-gb",
                labelKey: "language.optionEnglish",
            },
        ];

        return (
            <div
                className="language-selector-field"
                role="group"
                aria-label={t("language.label")}
            >
                {languageOptions.map((languageOption) => {
                    const isSelected = language === languageOption.code;

                    return (
                        <button
                            key={languageOption.code}
                            type="button"
                            className={`language-toggle-button${
                                isSelected
                                    ? " language-toggle-button-active"
                                    : ""
                            }`}
                            onClick={() => setLanguage(languageOption.code)}
                            aria-label={t(languageOption.labelKey)}
                            aria-pressed={isSelected}
                            title={t(languageOption.labelKey)}
                        >
                            <span
                                className={`language-toggle-flag ${languageOption.flagClass}`}
                                aria-hidden="true"
                            />
                            <span className="language-toggle-code">
                                {languageOption.shortLabel}
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    };

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
                <AppBranding />

                <SidebarSection title={t("language.sectionTitle")}>
                    {renderSidebarAction(<LanguageSelector />)}
                </SidebarSection>

                <SidebarSection title={t("sidebar.erElements")}>
                    <div
                        className="mxgraph-palette-container"
                        ref={toolbarRef}
                    />
                </SidebarSection>

                <SidebarSection title={t("sidebar.selection")}>
                    <SelectedElementHeader />
                    {renderSidebarAction(EmptySelectionGuidance())}

                    {renderSidebarAction(AddAttributeButton())}
                    {renderSidebarAction(RelationAddAttributeButton())}
                    {renderSidebarAction(GroupSelectedAttributesButton())}
                    {renderSidebarAction(AddChildAttributeButton())}
                    {renderSidebarAction(ConvertSubattributeToSimpleButton())}
                    {renderSidebarAction(ToggleAttributesButton())}
                    {renderSidebarAction(ToggleAttrKeyButton())}
                    {renderSidebarAction(TogglePartialKeyButton())}
                    {renderSidebarAction(ToggleMultivaluedAttributeButton())}
                    {renderSidebarAction(ToggleWeakEntityButton())}
                    {renderSidebarAction(ToggleIdentifyingRelationButton())}

                    {renderSidebarAction(RelationConfigurationButton())}
                    {renderSidebarAction(RelationRolesButton())}
                    {renderSidebarAction(IsaConfigurationButton())}
                    {renderSidebarAction(RelationCardinalitiesButton())}

                    {renderSidebarAction(DeleteMultipleSelectionButton())}
                    {renderSidebarAction(DeleteEntityButton())}
                    {renderSidebarAction(DeleteRelationButton())}
                    {renderSidebarAction(DeleteAttributeButton())}
                    {renderSidebarAction(DeleteIsaButton())}
                </SidebarSection>

                <SidebarSection title={t("sidebar.order")}>
                    {renderSidebarAction(MoveBackAndFrontButtons())}
                </SidebarSection>

                <SidebarSection title={t("sidebar.history")}>
                    {renderSidebarAction(UndoRedoButtons())}
                </SidebarSection>

                <SidebarSection title={t("sidebar.diagram")}>
                    {renderSidebarAction(GenerateStructureButton())}
                    {renderSidebarAction(ValidateDiagramButton())}
                    {renderSidebarAction(FitToDiagramButton())}
                    {renderSidebarAction(GenerateSQLButton())}
                    {renderSidebarAction(ExportJSONButton())}
                    {renderSidebarAction(ExportImageButton())}
                    {renderSidebarAction(ImportJSONButton())}
                    {renderSidebarAction(ResetCanvasButton())}
                </SidebarSection>

                <SidebarSection title={t("sidebar.information")}>
                    <div className="sidebar-info-actions">
                        <HelpButton />
                        <AboutButton />
                    </div>
                </SidebarSection>
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
