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
import { BUILD_DATE } from "../../buildInfo";
import {
    ATTRIBUTE_OWNER_TYPES,
    GENERATE_STRUCTURE_TEMPLATES,
    IDENTIFYING_RELATION_STRONG_SIDE_CARDINALITY,
    IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITIES,
    POSSIBLE_CARDINALITIES,
    RELATION_ARITIES,
    TERNARY_RELATION_CARDINALITIES,
    addAttributeToOwner,
    addChildAttributeToAttribute,
    applyIdentifyingRelationCardinalities,
    canRelationHoldAttributes,
    canRelationTypeHoldAttributes,
    clearIdentifyingRelationDomainSemantics,
    convertPartialKeyToPrimaryKey,
    convertPrimaryKeyToPartialKey,
    convertSimpleAttributeToCompositeAttribute,
    convertSubattributeToSimpleAttributeById,
    createAttribute,
    createEmptyIsaLink,
    createEmptyRelationSide,
    createExampleDiagramStructure,
    findAttributeTreeOwnerById,
    findEntityById,
    findEntityIndexById,
    findIsaById,
    findIsaIndexById,
    findRelationById,
    findRelationIndexById,
    generateUniqueAttributeName,
    getCascadedWeakConversionCandidate,
    getDefaultAttributeSemantics,
    getGenerateStructureTemplateById,
    getLastAttribute,
    getRelationArity,
    getRelationCardinalityDisplayValue,
    getRelationSideDisplayName,
    getRelationSideKeys,
    getRelationSideLabelDisplayValue,
    getWeakAndStrongSidesForRelation,
    getWeakSideOfIdentifyingRelation,
    groupRootAttributesIntoCompositeAttribute,
    isBinaryRelation,
    isEntityIsaSpecialization,
    isFirstAttributeForOwner,
    isIdentifyingRelation,
    isIsaConfigured,
    isMultivaluedAttribute,
    isPrimaryKeyAttribute,
    isRelationAttributeOwner,
    isRelationConfigured,
    isSelfRelation,
    isTernaryRelation,
    isWeakEntity,
    isaInvolvesEntity,
    normalizeDiagramData,
    relationHasBothEntitySides,
    relationInvolvesEntity,
    removeAllAttributesFromOwner,
    removeAttributeFromOwnerTreeByIdWithPromotion,
    resetRelationSides,
    toggleExclusivePartialKeyAttributeInTree,
    toggleExclusivePrimaryKeyAttributeInTree,
    updateAttributePosition,
    validateGraph,
} from "../../domain/er";
import { useLanguage } from "../../i18n/LanguageContext";
import { SUPPORTED_LANGUAGES } from "../../i18n/translations";
import { generateSQL } from "../../services/sql";
import {
    clearGraphCanvas,
    connectIsaGraphLinks,
    connectRelationGraphSides,
    getConfiguredIsaGraphCells,
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
    SAVE_FILE_RESULT,
    clearDiagramLocalStorage,
    exportDiagramToJsonFile,
    exportSqlScriptToFile,
    loadDiagramFromLocalStorage,
    readDiagramJsonFile,
    saveDiagramToLocalStorage,
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
    canAddChildAttributeToSelection,
    canConvertSelectedSubattributeToSimple,
    getCompositeAttributeSelectionTarget,
    getEntityAttributeKeySelectionData,
    getEntityMultivaluedAttributeSelectionData,
    getSimpleEntityAttributesGroupingSelectionData,
} from "./utils/selection/attributeSelection";
import { syncDiagramDataFromGraph } from "./utils/sync/diagramGraphSync";
import { reconstructDiagramGraph } from "./utils/sync/diagramReconstruction";
import { getValidationDialogMessages } from "./utils/validation/validationMessages";

const { mxGraph, mxEvent, mxConstants, mxPoint, mxGeometry } = MxGraph();

const HISTORY_LIMIT = 100;

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

const VALIDATION_DIALOG_SECTION_TITLES = new Set([
    "General",
    "Entidades y atributos",
    "Relaciones",
    "ISA",
    "SQL",
]);

const renderValidationDialogMessage = (message, index) => {
    const isSectionTitle = VALIDATION_DIALOG_SECTION_TITLES.has(message);
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

export default function App(props) {
    const { language, setLanguage, t } = useLanguage();

    const BUILD_LABEL = t("app.buildLabel", {
        date: BUILD_DATE,
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

    const undoStackRef = React.useRef([]);
    const redoStackRef = React.useRef([]);
    const lastHistorySnapshotRef = React.useRef(null);
    const isApplyingHistorySnapshotRef = React.useRef(false);

    const [canUndo, setCanUndo] = React.useState(false);
    const [canRedo, setCanRedo] = React.useState(false);

    const onSelected = React.useCallback(
        (evt) => {
            if (props.onSelected) {
                props.onSelected(evt);
            }
            setSelected(evt.cells?.[0] ?? null);
            setSelectionVersion((prevVersion) => prevVersion + 1);
        },
        [props],
    );

    function accessCell(idMx) {
        return graph.model.cells[idMx];
    }

    const getSelectedEntityData = () =>
        findEntityById(diagramRef.current, selected?.id);

    const getSelectedEntityAttributeKeyData = () =>
        getEntityAttributeKeySelectionData({
            diagram: diagramRef.current,
            selectedCell: selected,
        });

    const getSelectedEntityMultivaluedAttributeData = () =>
        getEntityMultivaluedAttributeSelectionData({
            diagram: diagramRef.current,
            selectedCell: selected,
        });

    const getSelectedSimpleEntityAttributesForGrouping = () =>
        getSimpleEntityAttributesGroupingSelectionData({
            diagram: diagramRef.current,
            selectionCells:
                typeof graph?.getSelectionCells === "function"
                    ? graph.getSelectionCells()
                    : [],
        });

    const getCompositeAttributeNameFromUser = (owner) => {
        const defaultName = generateUniqueAttributeName(
            owner?.attributes,
            "Atributo compuesto",
        );

        const compositeName = window.prompt(
            t("feedback.compositeAttributePrompt"),
            defaultName,
        );

        return compositeName?.trim() ?? "";
    };

    const hasSiblingAttributeWithName = ({
        owner,
        name,
        ignoredAttributeIds = [],
    }) => {
        const ignoredIds = new Set(ignoredAttributeIds);

        return (owner?.attributes ?? []).some(
            (attribute) =>
                !ignoredIds.has(attribute.idMx) && attribute.name === name,
        );
    };
    const getSelectedRelationData = () =>
        findRelationById(diagramRef.current, selected?.id) ?? null;

    const getSelectedIsaData = () =>
        findIsaById(diagramRef.current, selected?.id) ?? null;

    const saveToLocalStorage = () => {
        saveDiagramToLocalStorage(diagramRef.current);
    };

    const createDiagramSnapshot = (diagram = diagramRef.current) =>
        JSON.stringify(normalizeDiagramData(diagram));

    const readDiagramSnapshot = (snapshot) =>
        normalizeDiagramData(JSON.parse(snapshot));

    const updateHistoryAvailability = () => {
        setCanUndo(undoStackRef.current.length > 1);
        setCanRedo(redoStackRef.current.length > 0);
    };

    const resetDiagramHistory = () => {
        const currentSnapshot = createDiagramSnapshot();

        undoStackRef.current = [currentSnapshot];
        redoStackRef.current = [];
        lastHistorySnapshotRef.current = currentSnapshot;

        updateHistoryAvailability();
    };

    const recordCurrentDiagramInHistory = () => {
        if (isApplyingHistorySnapshotRef.current) {
            return;
        }

        const currentSnapshot = createDiagramSnapshot();

        if (currentSnapshot === lastHistorySnapshotRef.current) {
            return;
        }

        if (!lastHistorySnapshotRef.current) {
            undoStackRef.current = [currentSnapshot];
        } else {
            undoStackRef.current.push(currentSnapshot);
        }

        if (undoStackRef.current.length > HISTORY_LIMIT) {
            undoStackRef.current.shift();
        }

        redoStackRef.current = [];
        lastHistorySnapshotRef.current = currentSnapshot;

        updateHistoryAvailability();
    };

    const applyDiagramSnapshot = (snapshot) => {
        if (!graph || !snapshot) {
            return;
        }

        isApplyingHistorySnapshotRef.current = true;

        try {
            const diagramData = readDiagramSnapshot(snapshot);

            clearGraphCanvas(graph);
            recreateGraphFromDiagram(diagramData);

            if (typeof graph.clearSelection === "function") {
                graph.clearSelection();
            }

            setSelected(null);
            setSelectionVersion((prevVersion) => prevVersion + 1);

            saveToLocalStorage();
            lastHistorySnapshotRef.current = snapshot;
        } finally {
            isApplyingHistorySnapshotRef.current = false;
        }
    };

    const undoDiagramChange = () => {
        if (undoStackRef.current.length <= 1) {
            return false;
        }

        const currentSnapshot = undoStackRef.current.pop();
        redoStackRef.current.push(currentSnapshot);

        const previousSnapshot = undoStackRef.current.at(-1);

        applyDiagramSnapshot(previousSnapshot);
        updateHistoryAvailability();

        return true;
    };

    const redoDiagramChange = () => {
        if (redoStackRef.current.length === 0) {
            return false;
        }

        const nextSnapshot = redoStackRef.current.pop();

        undoStackRef.current.push(nextSnapshot);
        applyDiagramSnapshot(nextSnapshot);
        updateHistoryAvailability();

        return true;
    };

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

    const clearIdentifyingRelationSemantics = (relationId) => {
        const { relation } = clearIdentifyingRelationDomainSemantics(
            diagramRef.current,
            relationId,
        );

        if (!relation) return;

        removeIdentifyingRelationDecorator(relation.idMx);
        removeIdentifyingRelationEdgeDecorator(relation.idMx);

        const relationCell = accessCell(relation.idMx);

        if (relationCell) {
            graph
                .getModel()
                .setStyle(relationCell, getRelationStyleString(relation));
        }
    };

    const syncRelationCardinalityLabels = (relationData) => {
        if (!relationData) return;

        getRelationSideKeys(relationData).forEach((sideKey) => {
            const sideLabel = accessCell(relationData?.[sideKey]?.cell);

            if (sideLabel) {
                graph.model.setValue(
                    sideLabel,
                    getRelationSideLabelDisplayValue(relationData, sideKey),
                );
                graph.updateCellSize(sideLabel);
            }
        });
    };

    const removeRelationAttributes = (relationData) => {
        if (!relationData) return;

        const removedAttributes = removeAllAttributesFromOwner(relationData);

        removeAttributesCells(removedAttributes);

        relationData.canHoldAttributes = false;
    };

    const removeRelationConfiguration = (relation) => {
        if (!relation) return;

        clearIdentifyingRelationSemantics(relation.idMx);

        removeRelationConfigurationGraphCells({
            graph,
            relation,
            accessCell,
            getAttributesCells,
        });

        resetRelationSides(relation);
    };

    const removeIsaConfiguration = (isa) => {
        if (!isa) return;

        removeExistingGraphCells(
            graph,
            getConfiguredIsaGraphCells({
                isa,
                accessCell,
            }),
        );

        isa.generalization = createEmptyIsaLink();
        isa.specializations = [];
    };

    const getAttributeDataById = (attributeId) =>
        findAttributeTreeOwnerById(diagramRef.current, attributeId)
            ?.attribute ?? null;

    const convertEntityPrimaryKeyToPartialKey = (entity) => {
        const changedAttributes = convertPrimaryKeyToPartialKey(
            entity?.attributes,
        );

        changedAttributes.forEach(syncAttributeVisualRepresentation);
    };

    const convertEntityPartialKeyToPrimaryKey = (entity) => {
        const changedAttributes = convertPartialKeyToPrimaryKey(
            entity?.attributes,
        );

        changedAttributes.forEach(syncAttributeVisualRepresentation);
    };

    const recreateGraphFromDiagram = (diagramData) => {
        if (!diagramData) return;

        diagramRef.current = diagramData;
        updateEmptyCanvasState(diagramRef.current);

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
    };

    const recreateGraphFromLocalStorage = () => {
        const savedData = loadDiagramFromLocalStorage();

        recreateGraphFromDiagram(savedData);
    };

    const syncAndPersistDiagramData = ({ recordHistory = true } = {}) => {
        syncDiagramDataFromGraph({
            diagram: diagramRef.current,
            graph,
            accessCell,
            updateAttributePosition,
        });

        saveToLocalStorage();
        updateEmptyCanvasState();

        if (recordHistory) {
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

    const addAttribute = () => {
        let selectedDiag;
        let isRelation = false;
        if (
            isEntityShapeCell(selected) &&
            !isWeakEntityDecoratorCell(selected)
        ) {
            selectedDiag = findEntityById(diagramRef.current, selected.id);
        } else if (isRelationShapeCell(selected)) {
            selectedDiag = findRelationById(diagramRef.current, selected.id);
            isRelation = true;
        }

        if (!selectedDiag) return;

        const ownerType = isRelation
            ? ATTRIBUTE_OWNER_TYPES.RELATION
            : ATTRIBUTE_OWNER_TYPES.ENTITY;

        const semantics = getDefaultAttributeSemantics({
            ownerType,
            isFirstAttribute: isFirstAttributeForOwner(selectedDiag),
            isWeakEntityOwner: !isRelation && isWeakEntity(selectedDiag),
            isIsaSpecializationOwner:
                !isRelation &&
                isEntityIsaSpecialization(
                    diagramRef.current,
                    selectedDiag.idMx,
                ),
        });

        const source = selected;

        let offsetX = 120;
        let offsetY = -40;

        const lastAttribute = getLastAttribute(selectedDiag.attributes);

        if (lastAttribute) {
            const lastAttrCell = graph.getModel().getCell(lastAttribute.idMx);

            if (lastAttrCell?.geometry) {
                offsetX = lastAttrCell.geometry.x - source.geometry.x;
                offsetY = lastAttrCell.geometry.y - source.geometry.y + 20;
            }
        }

        const uniqueAttributeName = generateUniqueAttributeName(
            selectedDiag.attributes,
        );

        const { target, edge } = createAttributeGraphCells({
            name: uniqueAttributeName,
            source,
            offsetX,
            offsetY,
            semantics,
        });

        if (!isRelation && isWeakEntity(selectedDiag)) {
            syncWeakEntityDecorator(selected);
        }

        addAttributeToOwner(
            selectedDiag,
            createAttribute({
                idMx: target.id,
                name: target.value,
                position: {
                    x: target.geometry.x,
                    y: target.geometry.y,
                },
                key: semantics.key,
                partialKey: semantics.partialKey,
                cell: [target.id, edge.id],
                offsetX: target.geometry.x - selected.geometry.x,
                offsetY: target.geometry.y - selected.geometry.y,
            }),
        );

        syncAndPersistDiagramData();
        toast.success(t("feedback.attributeInserted"));
    };

    const getSelectedCompositeAttributeTarget = (attributeOwner) =>
        getCompositeAttributeSelectionTarget(attributeOwner);

    const canAddChildAttributeToSelectedAttribute = (attributeOwner) =>
        canAddChildAttributeToSelection(attributeOwner);

    const createSiblingSubattribute = ({
        parentAttribute,
        source,
        childAttributes,
        offsetX,
        offsetY,
        name = generateUniqueAttributeName(childAttributes),
    }) => {
        const semantics = {
            key: false,
            partialKey: false,
        };

        const { target, edge } = createAttributeGraphCells({
            name,
            source,
            offsetX,
            offsetY,
            semantics,
        });

        const childAttribute = createAttribute({
            idMx: target.id,
            name: target.value,
            position: {
                x: target.geometry.x,
                y: target.geometry.y,
            },
            key: false,
            partialKey: false,
            cell: [target.id, edge.id],
            offsetX,
            offsetY,
        });

        addChildAttributeToAttribute(parentAttribute, childAttribute);

        return childAttribute;
    };

    const groupSelectedSimpleAttributesIntoComposite = () => {
        const selectionData = getSelectedSimpleEntityAttributesForGrouping();

        if (!selectionData) {
            toast.error(t("feedback.selectSimpleAttributesSameEntity"));
            return;
        }

        const { owner, attributeOwners } = selectionData;
        const childAttributes = attributeOwners.map(
            (attributeOwner) => attributeOwner.attribute,
        );
        const childAttributeIds = childAttributes.map(
            (attribute) => attribute.idMx,
        );
        const compositeName = getCompositeAttributeNameFromUser(owner);

        if (!compositeName) {
            toast.error(t("feedback.compositeAttributeNeedsName"));
            return;
        }

        if (
            hasSiblingAttributeWithName({
                owner,
                name: compositeName,
                ignoredAttributeIds: childAttributeIds,
            })
        ) {
            toast.error(t("feedback.attributeNameAlreadyExists"));
            return;
        }

        const ownerCell = accessCell(owner.idMx);

        if (!ownerCell?.geometry) return;

        const childAttributeCells = childAttributes
            .map((attribute) => accessCell(attribute.idMx))
            .filter((cell) => cell?.geometry);

        if (childAttributeCells.length !== childAttributes.length) {
            toast.error(t("feedback.selectedAttributesNotFound"));
            return;
        }

        const averageChildX =
            childAttributeCells.reduce(
                (sum, cell) => sum + cell.geometry.x,
                0,
            ) / childAttributeCells.length;

        const averageChildY =
            childAttributeCells.reduce(
                (sum, cell) => sum + cell.geometry.y,
                0,
            ) / childAttributeCells.length;

        const offsetX = averageChildX - ownerCell.geometry.x;
        const offsetY = averageChildY - ownerCell.geometry.y;

        const createdCompositeCells = createAttributeGraphCells({
            name: compositeName,
            source: ownerCell,
            offsetX,
            offsetY,
            semantics: {
                key: false,
                partialKey: false,
            },
        });

        if (!createdCompositeCells) return;

        const { target, edge } = createdCompositeCells;

        const compositeAttribute = createAttribute({
            idMx: target.id,
            name: compositeName,
            position: {
                x: target.geometry.x,
                y: target.geometry.y,
            },
            key: false,
            partialKey: false,
            cell: [target.id, edge.id],
            offsetX,
            offsetY,
        });

        childAttributes.forEach(removeAttributeConnectionEdges);

        const groupingResult = groupRootAttributesIntoCompositeAttribute({
            owner,
            attributeIds: childAttributeIds,
            compositeAttribute,
        });

        if (!groupingResult.compositeAttribute) {
            removeAttributesCells([compositeAttribute]);
            toast.error(t("feedback.attributesCouldNotBeGrouped"));
            return;
        }

        childAttributes.forEach((attribute) => {
            reparentAttributeCellToCurrentOwner({
                attribute,
                attributeOwner: findAttributeTreeOwnerById(
                    diagramRef.current,
                    attribute.idMx,
                ),
            });
        });

        syncAttributeVisualRepresentation(compositeAttribute);

        graph.setSelectionCell(target);
        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);

        toast.success(t("feedback.attributesGrouped"));
    };

    const addChildAttribute = () => {
        if (!isAttributeShapeCell(selected)) return;

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected.id,
        );

        if (!attributeOwner) return;

        if (!canAddChildAttributeToSelectedAttribute(attributeOwner)) {
            toast.error(t("feedback.cannotConvertMultivaluedToComposite"));
            return;
        }

        const { compositeAttribute } =
            getSelectedCompositeAttributeTarget(attributeOwner);

        const source = accessCell(compositeAttribute.idMx);

        if (!source) return;

        if (
            attributeOwner.depth === 0 &&
            !compositeAttribute.children &&
            !isMultivaluedAttribute(compositeAttribute)
        ) {
            const originalAttributeName = compositeAttribute.name;
            const { target, edge } = createAttributeGraphCells({
                name: originalAttributeName,
                source,
                offsetX: 120,
                offsetY: -40,
                semantics: {
                    key: false,
                    partialKey: false,
                },
            });

            const originalLeaf = createAttribute({
                idMx: target.id,
                name: target.value,
                position: {
                    x: target.geometry.x,
                    y: target.geometry.y,
                },
                key: false,
                partialKey: false,
                cell: [target.id, edge.id],
                offsetX: 120,
                offsetY: -40,
            });

            convertSimpleAttributeToCompositeAttribute(
                compositeAttribute,
                originalLeaf,
            );
        }

        const childAttributes = compositeAttribute.children ?? [];

        let offsetX = 120;
        let offsetY = 40;

        const lastChildAttribute = getLastAttribute(childAttributes);

        if (lastChildAttribute) {
            const lastChildCell = graph
                .getModel()
                .getCell(lastChildAttribute.idMx);

            if (lastChildCell?.geometry) {
                offsetX = lastChildCell.geometry.x - source.geometry.x;
                offsetY = lastChildCell.geometry.y - source.geometry.y + 40;
            }
        }

        createSiblingSubattribute({
            parentAttribute: compositeAttribute,
            source,
            childAttributes,
            offsetX,
            offsetY,
        });

        syncAttributeVisualRepresentation(compositeAttribute);

        syncAndPersistDiagramData();
        toast.success(t("feedback.siblingSubattributeInserted"));
    };

    const setAttributesVisibility = (isRelationNM, visible) => {
        const selectedOwner = !isRelationNM
            ? findEntityById(diagramRef.current, selected.id)
            : findRelationById(diagramRef.current, selected.id);

        if (!selectedOwner) return;

        setOwnerAttributesVisible(selectedOwner, visible);

        setEntityWithAttributesHidden((currentAttributesHidden) => ({
            ...(currentAttributesHidden ?? {}),
            [selected.id]: !visible,
        }));

        refreshGraph();
    };

    const hideAttributes = (isRelationNM) => {
        setAttributesVisibility(isRelationNM, false);
    };

    const showAttributes = (isRelationNM) => {
        setAttributesVisibility(isRelationNM, true);
    };

    const toggleAttrKey = () => {
        const selectedEntityAttribute = getSelectedEntityAttributeKeyData();
        if (!selectedEntityAttribute) return;

        const { entity, attribute, selectedAttribute } =
            selectedEntityAttribute;

        if (isMultivaluedAttribute(attribute)) {
            toast.error(t("feedback.keyCannotBeMultivalued"));
            return;
        }

        if (isWeakEntity(entity)) {
            toast.error(t("feedback.weakEntityCannotHavePrimaryKey"));
            return;
        }

        if (isEntityIsaSpecialization(diagramRef.current, entity.idMx)) {
            toast.error(t("feedback.isaSpecializationCannotHavePrimaryKey"));
            return;
        }

        const result = toggleExclusivePrimaryKeyAttributeInTree(
            entity.attributes,
            selectedAttribute.idMx,
        );

        if (!result.updated) return;

        result.changedAttributes.forEach(syncAttributeVisualRepresentation);

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);

        toast.success(
            result.enabled
                ? t("feedback.attributeMarkedAsKey")
                : t("feedback.attributeKeyRemoved"),
        );
    };

    const toggleWeakEntity = () => {
        if (!selected) return;
        if (!isEntityShapeCell(selected)) return;
        if (isWeakEntityDecoratorCell(selected)) return;

        const entity = getSelectedEntityData();
        if (!entity) return;

        const shouldBecomeWeak = !isWeakEntity(entity);

        entity.weak = shouldBecomeWeak;

        if (shouldBecomeWeak) {
            convertEntityPrimaryKeyToPartialKey(entity);
            ensureWeakEntityDecorator(selected, entity);
            toast.success(t("feedback.entityMarkedWeak"));
        } else {
            clearIdentifyingRelationSemantics(entity.identifyingRelationId);
            convertEntityPartialKeyToPrimaryKey(entity);
            removeWeakEntityDecorator(entity.idMx);
            toast.success(t("feedback.entityMarkedStrong"));
        }

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);
    };

    const togglePartialKey = () => {
        if (!selected) return;
        if (!isAttributeShapeCell(selected)) return;

        const selectedEntityAttribute = getSelectedEntityAttributeKeyData();
        if (!selectedEntityAttribute) return;

        const { entity, attribute, selectedAttribute } =
            selectedEntityAttribute;

        if (!isWeakEntity(entity)) {
            toast.error(t("feedback.onlyWeakEntitiesCanHaveDiscriminant"));
            return;
        }

        if (isMultivaluedAttribute(attribute)) {
            toast.error(t("feedback.discriminantCannotBeMultivalued"));
            return;
        }

        const result = toggleExclusivePartialKeyAttributeInTree(
            entity.attributes,
            selectedAttribute.idMx,
        );

        if (!result.updated) return;

        result.changedAttributes.forEach(syncAttributeVisualRepresentation);

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);

        toast.success(
            result.enabled
                ? t("feedback.attributeMarkedAsDiscriminant")
                : t("feedback.discriminantRemoved"),
        );
    };

    const toggleIdentifyingRelation = () => {
        if (!selected) return;
        if (isIdentifyingRelationDecoratorCell(selected)) return;
        if (!isRelationShapeCell(selected)) return;

        const relation = getSelectedRelationData();
        if (!relation) return;

        let { weakEntity, strongEntity: ownerEntity } =
            getWeakAndStrongSidesForRelation(diagramRef.current, relation);

        if (!isIdentifyingRelation(relation)) {
            if (!relationHasBothEntitySides(relation)) {
                toast.error(t("feedback.configureBothRelationSidesFirst"));
                return;
            }

            if (!weakEntity || !ownerEntity) {
                const conversionCandidate = getCascadedWeakConversionCandidate(
                    diagramRef.current,
                    relation,
                );

                if (!conversionCandidate) {
                    toast.error(
                        t("feedback.identifyingRelationRequiresWeakAndOwner"),
                    );
                    return;
                }

                weakEntity = conversionCandidate.weakEntity;
                ownerEntity = conversionCandidate.ownerEntity;
                weakEntity.weak = true;
                convertEntityPrimaryKeyToPartialKey(weakEntity);

                const weakEntityCell = accessCell(weakEntity.idMx);
                if (weakEntityCell) {
                    ensureWeakEntityDecorator(weakEntityCell, weakEntity);
                }
            }

            if (
                weakEntity.identifyingRelationId &&
                weakEntity.identifyingRelationId !== relation.idMx
            ) {
                clearIdentifyingRelationSemantics(
                    weakEntity.identifyingRelationId,
                );
            }

            relation.isIdentifying = true;
            weakEntity.identifyingRelationId = relation.idMx;
            weakEntity.ownerEntityId = ownerEntity.idMx;

            const identifyingCardinalitiesApplied =
                applyIdentifyingRelationCardinalities(
                    diagramRef.current,
                    relation,
                );

            if (!identifyingCardinalitiesApplied) {
                relation.isIdentifying = false;
                weakEntity.identifyingRelationId = null;
                weakEntity.ownerEntityId = null;

                toast.error(t("feedback.identifyingCardinalitiesFailed"));
                return;
            }

            removeRelationAttributes(relation);
            syncRelationCardinalityLabels(relation);

            ensureIdentifyingRelationDecorator(selected, relation);
            ensureIdentifyingRelationEdgeDecorator(selected, relation);

            toast.success(t("feedback.relationMarkedIdentifying"));
        } else {
            clearIdentifyingRelationSemantics(relation.idMx);
            toast.success(t("feedback.identifyingRelationUnmarked"));
        }

        const relationCell = accessCell(relation.idMx);
        if (relationCell) {
            graph
                .getModel()
                .setStyle(relationCell, getRelationStyleString(relation));
        }

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);
    };

    const toggleMultivaluedAttribute = () => {
        const selectedEntityAttribute =
            getSelectedEntityMultivaluedAttributeData();

        if (!selectedEntityAttribute) return;

        const { attribute } = selectedEntityAttribute;

        if (attribute.key) {
            toast.error(t("feedback.keyCannotBeMultivalued"));
            return;
        }

        if (attribute.partialKey) {
            toast.error(t("feedback.discriminantCannotBeMultivalued"));
            return;
        }

        const shouldBecomeMultivalued = !isMultivaluedAttribute(attribute);

        if (shouldBecomeMultivalued) {
            attribute.multivalued = true;
        } else {
            attribute.multivalued = undefined;
        }

        syncAttributeVisualRepresentation(attribute);

        refreshGraph();
        syncAndPersistDiagramData();
        setRefreshDiagram((prevState) => !prevState);

        toast.success(
            shouldBecomeMultivalued
                ? t("feedback.attributeMarkedMultivalued")
                : t("feedback.attributeMultivaluedRemoved"),
        );
    };

    const MoveBackAndFrontButtons = () =>
        selected && (
            <React.Fragment>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={pushCellsBack(true)}
                >
                    {t("action.sendToBack")}
                </button>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={pushCellsBack(false)}
                >
                    {t("action.bringToFront")}
                </button>
            </React.Fragment>
        );

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

    const AddAttributeButton = () => {
        if (
            isEntityShapeCell(selected) &&
            !isWeakEntityDecoratorCell(selected)
        ) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={addAttribute}
                >
                    {t("action.addAttribute")}
                </button>
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
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={addAttribute}
                >
                    {t("action.addAttribute")}
                </button>
            );
        }
    };

    const GroupSelectedAttributesButton = () => {
        void selectionVersion;

        if (!getSelectedSimpleEntityAttributesForGrouping()) {
            return;
        }

        return (
            <button
                type="button"
                className="button-toolbar-action"
                onClick={groupSelectedSimpleAttributesIntoComposite}
            >
                {t("action.groupCompositeAttribute")}
            </button>
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
            <button
                type="button"
                className="button-toolbar-action"
                onClick={addChildAttribute}
            >
                {t("action.addSiblingSubattribute")}
            </button>
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
            <button
                type="button"
                className="button-toolbar-action"
                onClick={convertSelectedSubattributeToSimpleAttribute}
            >
                {t("action.convertToSimpleAttribute")}
            </button>
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
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={() => hideAttributes(isRelationNM)}
                    >
                        {t("action.hideAttributes")}
                    </button>
                );
            }
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={() => showAttributes(isRelationNM)}
                >
                    {t("action.showAttributes")}
                </button>
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
            <button
                type="button"
                className="button-toolbar-action"
                onClick={toggleAttrKey}
            >
                {attribute.key
                    ? t("action.removeKey")
                    : t("action.convertToKey")}
            </button>
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
            <button
                type="button"
                className="button-toolbar-action"
                onClick={togglePartialKey}
            >
                {attribute.partialKey
                    ? t("action.removeDiscriminant")
                    : t("action.convertToDiscriminant")}
            </button>
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
            <button
                type="button"
                className="button-toolbar-action"
                onClick={toggleMultivaluedAttribute}
            >
                {label}
            </button>
        );
    };

    const ToggleWeakEntityButton = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);

        const selectedEntityDiag = getSelectedEntityData();

        if (isEntity && selectedEntityDiag) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={toggleWeakEntity}
                >
                    {isWeakEntity(selectedEntityDiag)
                        ? t("action.removeWeakEntity")
                        : t("action.markWeakEntity")}
                </button>
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
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={toggleIdentifyingRelation}
                >
                    {isIdentifyingRelation(selectedRelationDiag)
                        ? t("action.unmarkIdentifyingRelation")
                        : t("action.markIdentifyingRelation")}
                </button>
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
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={handleClickOpen}
                    >
                        {t("action.configureRelation")}
                    </button>
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
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={handleClickOpen}
                >
                    {t("action.editRoles")}
                </button>
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
            const isa = getSelectedIsaData();

            if (!isa || !generalizationId || specializationIds.length === 0) {
                return;
            }

            if (specializationIds.includes(generalizationId)) {
                toast.error(
                    t("feedback.isaGeneralizationCannotAlsoBeSpecialization"),
                );
                return;
            }

            if (isIsaConfigured(isa)) {
                removeExistingGraphCells(
                    graph,
                    getConfiguredIsaGraphCells({
                        isa,
                        accessCell,
                    }),
                );
            }

            isa.generalization = createEmptyIsaLink({
                entityId: generalizationId,
            });

            isa.specializations = specializationIds.map((entityId) =>
                createEmptyIsaLink({
                    entityId,
                }),
            );

            const connectedEdges = connectIsaGraphLinks({
                graph,
                isaCell: selected,
                isa,
                generalizationEntityCell: accessCell(generalizationId),
                specializationEntityCells: specializationIds.map(accessCell),
            });

            if (!connectedEdges) {
                toast.error(t("feedback.isaHierarchyConfigurationFailed"));
                return;
            }

            syncAndPersistDiagramData();
            setOpen(false);
            toast.success(t("feedback.isaHierarchyConfigured"));
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
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={handleClickOpen}
                >
                    {t("action.configureIsa")}
                </button>
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
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={handleClickOpen}
                    >
                        {t("action.configureCardinalities")}
                    </button>
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
    const canConvertSelectedSubattributeToSimpleAttribute = (attributeOwner) =>
        canConvertSelectedSubattributeToSimple(attributeOwner);

    const convertSelectedSubattributeToSimpleAttribute = () => {
        if (!isAttributeShapeCell(selected)) return;

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected.id,
        );

        if (!canConvertSelectedSubattributeToSimpleAttribute(attributeOwner)) {
            return;
        }

        const { owner } = attributeOwner;

        const { convertedAttributes, removedCompositeAttribute } =
            convertSubattributeToSimpleAttributeById(owner, selected.id);

        if (convertedAttributes.length === 0) return;

        convertedAttributes.forEach(removeAttributeConnectionEdges);

        removeAttributesCells([removedCompositeAttribute].filter(Boolean));

        convertedAttributes.forEach((attribute) => {
            reparentAttributeCellToCurrentOwner({
                attribute,
                attributeOwner: findAttributeTreeOwnerById(
                    diagramRef.current,
                    attribute.idMx,
                ),
            });
        });

        syncAndPersistDiagramData();

        toast.success(
            convertedAttributes.length > 1
                ? t("feedback.subattributesConvertedToSimple")
                : t("feedback.subattributeConvertedToSimple"),
        );
    };

    const deleteSelectedEntity = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);

        if (!isEntity) {
            return false;
        }

        const entityIndex = findEntityIndexById(
            diagramRef.current,
            selected.id,
        );

        if (entityIndex === -1) {
            syncAndPersistDiagramData();
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

        syncAndPersistDiagramData();

        return true;
    };

    const deleteSelectedAttribute = () => {
        if (!isAttributeShapeCell(selected)) {
            return false;
        }

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected.id,
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
        } = removeAttributeFromOwnerTreeByIdWithPromotion(owner, selected.id);

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

        refreshGraph();
        syncAndPersistDiagramData();

        return true;
    };

    const deleteSelectedRelation = () => {
        if (!isRelationShapeCell(selected)) {
            return false;
        }

        const relationIndex = findRelationIndexById(
            diagramRef.current,
            selected.id,
        );

        if (relationIndex === -1) {
            syncAndPersistDiagramData();
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

        syncAndPersistDiagramData();

        return true;
    };

    const deleteSelectedIsa = () => {
        if (!isIsaShapeCell(selected)) {
            return false;
        }

        const isaIndex = findIsaIndexById(diagramRef.current, selected.id);

        if (isaIndex === -1) {
            syncAndPersistDiagramData();
            return false;
        }

        const isa = diagramRef.current.isas[isaIndex];

        diagramRef.current.isas.splice(isaIndex, 1);

        removeIsaGraphCells({
            graph,
            isa,
            accessCell,
        });

        syncAndPersistDiagramData();

        return true;
    };

    const deleteSelectedDiagramElement = () => {
        if (!selected) {
            return false;
        }

        if (
            isEntityShapeCell(selected) &&
            !isWeakEntityDecoratorCell(selected)
        ) {
            return deleteSelectedEntity();
        }

        if (isRelationShapeCell(selected)) {
            return deleteSelectedRelation();
        }

        if (isAttributeShapeCell(selected)) {
            return deleteSelectedAttribute();
        }

        if (isIsaShapeCell(selected)) {
            return deleteSelectedIsa();
        }

        return false;
    };

    const DeleteEntityButton = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);

        if (!isEntity) {
            return;
        }

        return (
            <button
                type="button"
                className="button-toolbar-action button-toolbar-action-danger"
                onClick={deleteSelectedEntity}
            >
                {t("action.delete")}
            </button>
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
            <button
                type="button"
                className="button-toolbar-action button-toolbar-action-danger"
                onClick={deleteSelectedAttribute}
            >
                {t("action.delete")}
            </button>
        );
    };

    const DeleteRelationButton = () => {
        const isRelation = isRelationShapeCell(selected);

        if (!isRelation) {
            return;
        }

        return (
            <button
                type="button"
                className="button-toolbar-action button-toolbar-action-danger"
                onClick={deleteSelectedRelation}
            >
                {t("action.delete")}
            </button>
        );
    };

    const DeleteIsaButton = () => {
        const isIsa = isIsaShapeCell(selected);

        if (!isIsa) {
            return;
        }

        return (
            <button
                type="button"
                className="button-toolbar-action button-toolbar-action-danger"
                onClick={deleteSelectedIsa}
            >
                {t("action.delete")}
            </button>
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

            const deleted = deleteSelectedDiagramElement();

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
            <button
                type="button"
                className="button-toolbar-action"
                onClick={undoDiagramChange}
                disabled={!canUndo}
                title="Ctrl+Z"
            >
                {t("action.undo")}
            </button>
            <button
                type="button"
                className="button-toolbar-action"
                onClick={redoDiagramChange}
                disabled={!canRedo}
                title="Ctrl+Y / Ctrl+Shift+Z"
            >
                {t("action.redo")}
            </button>
        </>
    );

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
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={handleClickOpen}
                >
                    {t("diagram.generateSql")}
                </button>
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
                        {validationMessages.map(renderValidationDialogMessage)}
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
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={handleClickOpen}
                >
                    {t("diagram.exportJson")}
                </button>
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
                        {validationMessages.map(renderValidationDialogMessage)}
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

    const ImportJSONButton = () => {
        const [open, setOpen] = React.useState(false);
        const [validationMessages, setValidationMessages] = React.useState([]);

        const handleClickOpen = () => {
            setValidationMessages([]);
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleFileChange = async (event) => {
            const file = event.target.files[0];

            if (!file) return;

            try {
                const importedDiagram = await readDiagramJsonFile(file);
                const diagnostics = validateGraph(importedDiagram);

                setValidationMessages(
                    getValidationDialogMessages(
                        diagnostics,
                        "importJson",
                        importedDiagram,
                    ),
                );

                if (diagnostics.isValid) {
                    resetCanvas({ recordHistory: false });
                    recreateGraphFromDiagram(importedDiagram);
                    saveToLocalStorage();
                    recordCurrentDiagramInHistory();

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
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={handleClickOpen}
                >
                    {t("diagram.importJson")}
                </button>
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
                        {validationMessages.map(renderValidationDialogMessage)}
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

    const resetCanvas = ({ recordHistory = false } = {}) => {
        diagramRef.current = {
            entities: [],
            relations: [],
            isas: [],
        };

        clearDiagramLocalStorage();
        clearGraphCanvas(graph);
        updateEmptyCanvasState();

        if (typeof graph?.clearSelection === "function") {
            graph.clearSelection();
        }

        setSelected(null);
        setSelectionVersion((prevVersion) => prevVersion + 1);

        if (recordHistory) {
            saveToLocalStorage();
            recordCurrentDiagramInHistory();
        }
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
                <button
                    type="button"
                    className="button-toolbar-action button-toolbar-action-danger"
                    onClick={handleClickOpen}
                >
                    {t("diagram.reset")}
                </button>
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

        const selectedTemplate =
            getGenerateStructureTemplateById(selectedTemplateId);

        const getTemplateName = (template) =>
            t(`generateStructure.templates.${template.id}.name`);

        const getTemplateDescription = (template) =>
            t(`generateStructure.templates.${template.id}.description`);

        const selectedTemplateName = getTemplateName(selectedTemplate);

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleTemplateChange = (event) => {
            setSelectedTemplateId(event.target.value);
        };

        const handleAccept = () => {
            const exampleDiagram = selectedTemplate.createDiagram();

            resetCanvas({ recordHistory: false });
            recreateGraphFromDiagram(exampleDiagram);
            saveToLocalStorage();
            recordCurrentDiagramInHistory();

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
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={handleClickOpen}
                >
                    {t("generateStructure.button")}
                </button>
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

    const LanguageSelector = () => {
        const handleChangeLanguage = (event) => {
            setLanguage(event.target.value);
        };

        return (
            <div className="language-selector-field">
                <select
                    id="language-selector"
                    className="language-selector-select"
                    value={language}
                    onChange={handleChangeLanguage}
                    aria-label={t("language.label")}
                >
                    {SUPPORTED_LANGUAGES.map((supportedLanguage) => (
                        <option
                            key={supportedLanguage.code}
                            value={supportedLanguage.code}
                        >
                            {t(supportedLanguage.labelKey)}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    return (
        <div className="mxgraph-container">
            <div className="build-info-badge">{BUILD_LABEL}</div>
            <div className="mxgraph-toolbar-container">
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
                    {renderSidebarAction(GenerateSQLButton())}
                    {renderSidebarAction(ExportJSONButton())}
                    {renderSidebarAction(ImportJSONButton())}
                    {renderSidebarAction(ResetCanvasButton())}
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
