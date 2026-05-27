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
    TextField,
} from "@mui/material";
import { default as MxGraph } from "mxgraph";
import toast, { Toaster } from "react-hot-toast";
import { BUILD_DATE } from "../../buildInfo";
import {
    ATTRIBUTE_OWNER_TYPES,
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
    createEmptyRelationSide,
    findAttributeTreeOwnerById,
    findEntityById,
    findEntityIndexById,
    findRelationById,
    findRelationIndexById,
    generateUniqueAttributeName,
    getCascadedWeakConversionCandidate,
    getDefaultAttributeSemantics,
    getLastAttribute,
    getRelationArity,
    getRelationCardinalityDisplayValue,
    getRelationSideDisplayName,
    getRelationSideKeys,
    getWeakAndStrongSidesForRelation,
    getWeakSideOfIdentifyingRelation,
    groupRootAttributesIntoCompositeAttribute,
    isBinaryRelation,
    isFirstAttributeForOwner,
    isIdentifyingRelation,
    isMultivaluedAttribute,
    isPrimaryKeyAttribute,
    isRelationAttributeOwner,
    isRelationConfigured,
    isSelfRelation,
    isTernaryRelation,
    isWeakEntity,
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
import { generateSQL } from "../../services/sql";
import {
    clearGraphCanvas,
    connectRelationGraphSides,
    getConfiguredRelationGraphCells,
    installCellGeometrySyncHandlers,
    removeEntityGraphCells,
    removeExistingGraphCells,
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

export default function App(props) {
    const BUILD_LABEL = `Build: ${BUILD_DATE}`;

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
            "Nombre del atributo compuesto:",
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

    const saveToLocalStorage = () => {
        saveDiagramToLocalStorage(diagramRef.current);
    };

    const showSaveFileResultToast = (result) => {
        if (result === SAVE_FILE_RESULT.SAVED) {
            toast.success("Archivo guardado correctamente.");
            return;
        }

        if (result === SAVE_FILE_RESULT.CANCELLED) {
            toast("Guardado cancelado.");
            return;
        }

        if (result === SAVE_FILE_RESULT.UNSUPPORTED) {
            toast.error(
                "Tu navegador no permite elegir dónde guardar el archivo.",
            );
            return;
        }

        toast.error("No se pudo guardar el archivo.");
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
            const cardinality = relationData[sideKey].cardinality;

            if (sideLabel) {
                graph.model.setValue(
                    sideLabel,
                    getRelationCardinalityDisplayValue(
                        relationData,
                        cardinality,
                    ),
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

    const syncAndPersistDiagramData = () => {
        syncDiagramDataFromGraph({
            diagram: diagramRef.current,
            graph,
            accessCell,
            updateAttributePosition,
        });

        saveToLocalStorage();
    };

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
        toast.success("Atributo insertado");
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
            toast.error(
                "Selecciona al menos dos atributos simples de la misma entidad.",
            );
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
            toast.error("El atributo compuesto necesita un nombre.");
            return;
        }

        if (
            hasSiblingAttributeWithName({
                owner,
                name: compositeName,
                ignoredAttributeIds: childAttributeIds,
            })
        ) {
            toast.error("Ya existe un atributo con ese nombre en la entidad.");
            return;
        }

        const ownerCell = accessCell(owner.idMx);

        if (!ownerCell?.geometry) return;

        const childAttributeCells = childAttributes
            .map((attribute) => accessCell(attribute.idMx))
            .filter((cell) => cell?.geometry);

        if (childAttributeCells.length !== childAttributes.length) {
            toast.error(
                "No se pudieron localizar los atributos seleccionados.",
            );
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
            toast.error("No se pudieron agrupar los atributos seleccionados.");
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

        toast.success("Atributos agrupados en un atributo compuesto");
    };

    const addChildAttribute = () => {
        if (!isAttributeShapeCell(selected)) return;

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected.id,
        );

        if (!attributeOwner) return;

        if (!canAddChildAttributeToSelectedAttribute(attributeOwner)) {
            toast.error(
                "No se puede convertir directamente un atributo multivaluado simple en compuesto.",
            );
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
        toast.success("Subatributo hermano insertado");
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
            toast.error("Una clave no puede ser multivaluada.");
            return;
        }

        if (isWeakEntity(entity)) {
            toast.error(
                "Una entidad débil no puede tener clave primaria. Usa un atributo discriminante.",
            );
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
                ? "Atributo marcado como clave"
                : "Clave eliminada del atributo",
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
            toast.success("Entidad marcada como débil");
        } else {
            clearIdentifyingRelationSemantics(entity.identifyingRelationId);
            convertEntityPartialKeyToPrimaryKey(entity);
            removeWeakEntityDecorator(entity.idMx);
            toast.success("Entidad marcada como fuerte");
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
            toast.error(
                "Solo las entidades débiles pueden tener atributo discriminante.",
            );
            return;
        }

        if (isMultivaluedAttribute(attribute)) {
            toast.error("Un discriminante no puede ser multivaluado.");
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
                ? "Atributo marcado como discriminante"
                : "Discriminante eliminado",
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
                toast.error("Configura primero los dos lados de la relación.");
                return;
            }

            if (!weakEntity || !ownerEntity) {
                const conversionCandidate = getCascadedWeakConversionCandidate(
                    diagramRef.current,
                    relation,
                );

                if (!conversionCandidate) {
                    toast.error(
                        "Una relación de dependencia por identificación debe conectar una entidad débil dependiente con una entidad propietaria distinta. Si ambas entidades son fuertes, solo se puede inferir una cascada cuando una de ellas ya actúa como propietaria de otra entidad débil.",
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

                toast.error(
                    "No se pudieron aplicar las cardinalidades de la relación de dependencia por identificación.",
                );
                return;
            }

            removeRelationAttributes(relation);
            syncRelationCardinalityLabels(relation);

            ensureIdentifyingRelationDecorator(selected, relation);
            ensureIdentifyingRelationEdgeDecorator(selected, relation);

            toast.success(
                "Relación marcada como dependencia por identificación",
            );
        } else {
            clearIdentifyingRelationSemantics(relation.idMx);
            toast.success("Dependencia por identificación desmarcada");
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
            toast.error("Una clave no puede ser multivaluada.");
            return;
        }

        if (attribute.partialKey) {
            toast.error("Un discriminante no puede ser multivaluado.");
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
                ? "Atributo marcado como multivaluado"
                : "Multivaluado eliminado del atributo",
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
                    Move back
                </button>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={pushCellsBack(false)}
                >
                    Move front
                </button>
            </React.Fragment>
        );

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
                    Añadir atributo
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
                    Añadir atributo
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
                Agrupar en atributo compuesto
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
                Añadir subatributo hermano
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
                Convertir en atributo simple
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
                        Ocultar atributos
                    </button>
                );
            }
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={() => showAttributes(isRelationNM)}
                >
                    Mostrar atributos
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

        return (
            <button
                type="button"
                className="button-toolbar-action"
                onClick={toggleAttrKey}
            >
                {attribute.key ? "Quitar clave" : "Convertir en clave"}
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
                    ? "Quitar discriminante"
                    : "Convertir en discriminante"}
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
                ? "Quitar multivaluado del compuesto"
                : "Marcar compuesto como multivaluado"
            : isMultivaluedAttribute(attribute)
              ? "Quitar multivaluado"
              : "Marcar multivaluado";

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
                        ? "Quitar entidad débil"
                        : "Marcar como entidad débil"}
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
                        ? "Desmarcar como dependencia por identificación"
                        : "Marcar como dependencia por identificación"}
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
                        Configurar relación
                    </button>
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">
                            {"Configurar relación"}
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                Escoger los lados de esta relación
                            </DialogContentText>
                            <Box sx={{ minHeight: 10 }} />
                            <Box sx={{ minWidth: 120 }}>
                                <FormControl fullWidth>
                                    <InputLabel id="relation-arity-label">
                                        Tipo de relación
                                    </InputLabel>
                                    <Select
                                        id="relation-arity"
                                        value={relationArity}
                                        label="Tipo de relación"
                                        onChange={handleChangeRelationArity}
                                    >
                                        <MenuItem
                                            value={RELATION_ARITIES.BINARY}
                                        >
                                            Binaria
                                        </MenuItem>
                                        <MenuItem
                                            value={RELATION_ARITIES.TERNARY}
                                        >
                                            Ternaria
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                                <Box sx={{ minHeight: 10 }} />
                                <FormControl fullWidth>
                                    <InputLabel id="side1-label">
                                        Lado 1
                                    </InputLabel>
                                    <Select
                                        id="side1"
                                        value={side1}
                                        label="Lado 1"
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
                                            label="Rol lado 1"
                                            value={side1Role}
                                            onChange={handleChangeSide1Role}
                                            fullWidth
                                        />
                                    </>
                                )}
                                <Box sx={{ minHeight: 10 }} />
                                <FormControl fullWidth>
                                    <InputLabel id="side2-label">
                                        Lado 2
                                    </InputLabel>
                                    <Select
                                        id="side2"
                                        value={side2}
                                        label="Lado 2"
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
                                            label="Rol lado 2"
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
                                                Lado 3
                                            </InputLabel>
                                            <Select
                                                id="side3"
                                                value={side3}
                                                label="Lado 3"
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
                                                    label="Rol lado 3"
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
                            <Button onClick={handleClose}>Cancelar</Button>
                            <Button
                                onClick={handleAccept}
                                autoFocus
                                disabled={acceptDisabled}
                            >
                                Aceptar
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            );
        }
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
                toast.error(
                    "No se pudieron resolver los lados de la relación de dependencia por identificación.",
                );
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
                        Configurar cardinalidades
                    </button>
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">
                            {"Configurar cardinalidades"}
                        </DialogTitle>
                        {!isConfigured && (
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                    Esta relación todavía no está configurada
                                </DialogContentText>
                            </DialogContent>
                        )}
                        {isConfigured && (
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                    Escoger las cardinalidades de esta relación
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
                            <Button onClick={handleClose}>Cancelar</Button>
                            <Button
                                onClick={handleAccept}
                                autoFocus
                                disabled={acceptDisabled}
                            >
                                Aceptar
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            );
        }
    };

    const DeleteEntityButton = () => {
        const isEntity =
            isEntityShapeCell(selected) && !isWeakEntityDecoratorCell(selected);

        function deleteEntity() {
            // Find the entity in diagramRef.current.entities
            const entityIndex = findEntityIndexById(
                diagramRef.current,
                selected.id,
            );

            if (entityIndex === -1) {
                syncAndPersistDiagramData();
                return;
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
                .filter((relation) =>
                    relationInvolvesEntity(relation, entity.idMx),
                )
                .forEach(removeRelationConfiguration);
            syncAndPersistDiagramData();
        }
        if (isEntity) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={deleteEntity}
                >
                    Borrar
                </button>
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
                ? "Subatributos convertidos en atributos simples"
                : "Subatributo convertido en atributo simple",
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

        function deleteAttribute() {
            const attributeOwner = findAttributeTreeOwnerById(
                diagramRef.current,
                selected.id,
            );

            if (!attributeOwner) return;

            const { owner } = attributeOwner;

            const parentAttribute = attributeOwner.parent;

            const {
                removedAttribute,
                removedCompositeAttribute,
                promotedAttribute,
            } = removeAttributeFromOwnerTreeByIdWithPromotion(
                owner,
                selected.id,
            );

            if (!removedAttribute) return;

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
        }
        return (
            <button
                type="button"
                className="button-toolbar-action"
                onClick={deleteAttribute}
            >
                Borrar
            </button>
        );
    };

    const DeleteRelationButton = () => {
        const isRelation = isRelationShapeCell(selected);

        function deleteRelation() {
            // Find the relation in diagramRef.current.relations
            const relationIndex = findRelationIndexById(
                diagramRef.current,
                selected.id,
            );

            if (relationIndex === -1) {
                syncAndPersistDiagramData();
                return;
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
        }

        if (isRelation) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={deleteRelation}
                >
                    Borrar
                </button>
            );
        }
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
                getValidationDialogMessages(diagnostics, "sql"),
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
                    Generar SQL
                </button>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {"Generación script SQL"}
                    </DialogTitle>
                    <DialogContent>
                        {validationMessages.map((message) => (
                            <DialogContentText key={message}>
                                {message}
                            </DialogContentText>
                        ))}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancelar</Button>
                        <Button
                            onClick={handleAccept}
                            autoFocus
                            disabled={acceptDisabled}
                        >
                            Aceptar
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
                getValidationDialogMessages(diagnostics, "exportJson"),
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
                    Exportar JSON
                </button>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {"Exportación diagrama en JSON"}
                    </DialogTitle>
                    <DialogContent>
                        {validationMessages.map((message) => (
                            <DialogContentText key={message}>
                                {message}
                            </DialogContentText>
                        ))}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancelar</Button>
                        <Button
                            onClick={handleAccept}
                            autoFocus
                            disabled={acceptDisabled}
                        >
                            Aceptar
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
                    getValidationDialogMessages(diagnostics, "importJson"),
                );

                if (diagnostics.isValid) {
                    resetCanvas();
                    saveDiagramToLocalStorage(importedDiagram);
                    recreateGraphFromDiagram(importedDiagram);
                    setOpen(false);
                    toast.success("Diagrama importado con éxito.");
                } else {
                    toast.error(
                        "El diagrama no se ha podido importar porque no es válido.",
                    );
                }
            } catch (error) {
                setValidationMessages([
                    "No se ha podido importar el diagrama porque el archivo JSON no es válido.",
                ]);
                toast.error("El diagrama no se ha podido importar.");
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
                    Importar JSON
                </button>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {"Importación de diagrama desde JSON"}
                    </DialogTitle>
                    <DialogContent>
                        {validationMessages.map((message) => (
                            <DialogContentText key={message}>
                                {message}
                            </DialogContentText>
                        ))}
                        <input
                            type="file"
                            accept="application/json"
                            onChange={handleFileChange}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancelar</Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    const resetCanvas = () => {
        diagramRef.current.entities = [];
        diagramRef.current.relations = [];
        diagramRef.current.isas = [];
        clearDiagramLocalStorage();
        clearGraphCanvas(graph);
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
            resetCanvas();

            setRefreshDiagram((prevState) => !prevState);
            setOpen(false);
        };

        return (
            <>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={handleClickOpen}
                >
                    Reiniciar
                </button>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {"Reiniciar diagrama"}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            ¿Estás seguro de que deseas reiniciar el diagrama?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancelar</Button>
                        <Button onClick={handleAccept} autoFocus>
                            Aceptar
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    };

    return (
        <div className="mxgraph-container">
            <div className="build-info-badge">{BUILD_LABEL}</div>
            <div className="mxgraph-toolbar-container">
                <div className="mxgraph-toolbar-container" ref={toolbarRef} />

                <div>{AddAttributeButton()}</div>
                <div>{RelationAddAttributeButton()}</div>
                <div>{GroupSelectedAttributesButton()}</div>
                <div>{AddChildAttributeButton()}</div>
                <div>{ConvertSubattributeToSimpleButton()}</div>
                <div>{ToggleAttributesButton()}</div>
                <div>{ToggleAttrKeyButton()}</div>
                <div>{TogglePartialKeyButton()}</div>
                <div>{ToggleMultivaluedAttributeButton()}</div>
                <div>{ToggleWeakEntityButton()}</div>
                <div>{ToggleIdentifyingRelationButton()}</div>

                <div>{RelationConfigurationButton()}</div>
                <div>{RelationCardinalitiesButton()}</div>

                <div>{DeleteEntityButton()}</div>
                <div>{DeleteRelationButton()}</div>
                <div>{DeleteAttributeButton()}</div>

                <div>{MoveBackAndFrontButtons()}</div>

                <div>{GenerateSQLButton()}</div>
                <div>{ExportJSONButton()}</div>
                <div>{ImportJSONButton()}</div>
                <div>{ResetCanvasButton()}</div>
            </div>
            <div ref={containerRef} className="mxgraph-drawing-container" />
            <Toaster position="bottom-left" />
        </div>
    );
}
