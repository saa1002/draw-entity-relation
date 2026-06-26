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
    Select,
} from "@mui/material";
import { default as MxGraph } from "mxgraph";
import toast, { Toaster } from "react-hot-toast";
import { APP_VERSION, BUILD_COMMIT, BUILD_DATE } from "../../buildInfo";
import {
    DIAGRAM_COMPOSITION_MODES,
    GENERATE_STRUCTURE_TEMPLATES,
    canRelationHoldAttributes,
    findAttributeTreeOwnerById,
    findEntityById,
    findRelationById,
    getGenerateStructureTemplateById,
    getWeakSideOfIdentifyingRelation,
    isIdentifyingRelation,
    isSelfRelation,
    isWeakEntity,
    updateAttributePosition,
    validateGraph,
} from "../../domain/er";
import { useLanguage } from "../../i18n/LanguageContext";
import { SUPPORTED_LANGUAGES } from "../../i18n/translations";
import { generateSQL } from "../../services/sql";
import { useAttributeActions } from "./hooks/useAttributeActions";
import { useDeletionActions } from "./hooks/useDeletionActions";
import { useDiagramHistory } from "./hooks/useDiagramHistory";
import { useDiagramPersistence } from "./hooks/useDiagramPersistence";
import { useIsaActions } from "./hooks/useIsaActions";
import { useRelationActions } from "./hooks/useRelationActions";
import { DiagramEditorSidebar } from "./panels/DiagramEditorSidebar";
import {
    fitGraphToDiagram,
    installCellGeometrySyncHandlers,
} from "./utils/graph/graphCanvas";
import { installGraphInteractionOverrides } from "./utils/graph/graphInteractionOverrides";
import { installGraphLabelEditingHandler } from "./utils/graph/graphLabelEditing";
import setInitialConfiguration from "./utils/graph/setInitialConfiguration";
import {
    installDiagramEditorStyles,
    isAttributeShapeCell,
    isEntityShapeCell,
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
                <DiagramEditorSidebar
                    graph={graph}
                    selected={selected}
                    selectionSize={selectionSize}
                    selectionVersion={selectionVersion}
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
