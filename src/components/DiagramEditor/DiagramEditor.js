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
import { BUILD_DATE } from "../../buildInfo";
import {
    ATTRIBUTE_OWNER_TYPES,
    POSSIBLE_CARDINALITIES,
    addAttributeToOwner,
    addChildAttributeToAttribute,
    applyIdentifyingRelationCardinalities,
    canRelationHoldAttributes,
    clearIdentifyingRelationDomainSemantics,
    convertPartialKeyToPrimaryKey,
    convertPrimaryKeyToPartialKey,
    convertSubattributeToSimpleAttributeById,
    createAttribute,
    findAttributeOwnerById,
    findAttributeTreeOwnerById,
    findEntityById,
    findEntityIndexById,
    findRelationById,
    findRelationIndexById,
    generateUniqueAttributeName,
    getCascadedWeakConversionCandidate,
    getDefaultAttributeSemantics,
    getLastAttribute,
    getWeakAndStrongSidesForRelation,
    getWeakSideOfIdentifyingRelation,
    isEntityAttributeOwner,
    isFirstAttributeForOwner,
    isIdentifyingRelation,
    isManyToManyRelation,
    isMultivaluedAttribute,
    isPrimaryKeyAttribute,
    isRelationAttributeOwner,
    isRelationConfigured,
    isSelfRelation,
    isWeakEntity,
    relationHasBothEntitySides,
    relationInvolvesEntity,
    removeAllAttributesFromOwner,
    removeAttributeFromOwnerTreeByIdWithPromotion,
    resetRelationSides,
    toggleExclusivePartialKeyAttribute,
    toggleExclusivePrimaryKeyAttribute,
    updateAttributePosition,
    validateGraph,
} from "../../domain/er";
import { generateSQL } from "../../services/sql";
import { clearGraphCanvas } from "./utils/graph/graphCanvas";
import { installGraphInteractionOverrides } from "./utils/graph/graphInteractionOverrides";
import { installGraphLabelEditingHandler } from "./utils/graph/graphLabelEditing";
import setInitialConfiguration from "./utils/graph/setInitialConfiguration";
import {
    getAttributeDimensions,
    getCardinalityStyleString,
    getRelationStyleString,
    installDiagramEditorStyles,
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
import {
    createAttributeRenderingHelpers,
    getAttributeDisplayValue,
    getAttributeRenderDimensions,
    getAttributeStyleString,
} from "./utils/rendering/attributeRendering";
import {
    createEntityRenderingHelpers,
    isWeakEntityDecoratorCell,
} from "./utils/rendering/entityRendering";
import {
    createRelationRenderingHelpers,
    isIdentifyingRelationDecoratorCell,
} from "./utils/rendering/relationRendering";
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
    });
    const [selected, setSelected] = React.useState(null);
    const [entityWithAttributesHidden, setEntityWithAttributesHidden] =
        React.useState(null);

    const [refreshDiagram, setRefreshDiagram] = React.useState(false);

    const onSelected = React.useCallback(
        (evt) => {
            if (props.onSelected) {
                props.onSelected(evt);
            }
            setSelected(evt.cells?.[0] ?? null);
        },
        [props],
    );

    function accessCell(idMx) {
        return graph.model.cells[idMx];
    }
    const getSelectedEntityData = () =>
        findEntityById(diagramRef.current, selected?.id);

    const getSelectedEntityAttributeData = () => {
        const attributeOwner = findAttributeOwnerById(
            diagramRef.current,
            selected?.id,
        );

        if (!isEntityAttributeOwner(attributeOwner)) {
            return null;
        }

        return {
            entity: attributeOwner.owner,
            attribute: attributeOwner.attribute,
        };
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
        setOwnerAttributesVisible,
    } = createAttributeRenderingHelpers({
        graph,
        accessCell,
        mxPoint,
        mxGeometry,
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

        const side1Label = accessCell(relationData?.side1?.cell);
        const side2Label = accessCell(relationData?.side2?.cell);

        if (side1Label) {
            graph.model.setValue(side1Label, relationData.side1.cardinality);
            graph.updateCellSize(side1Label);
        }

        if (side2Label) {
            graph.model.setValue(side2Label, relationData.side2.cardinality);
            graph.updateCellSize(side2Label);
        }
    };

    const removeRelationAttributes = (relationData) => {
        if (!relationData) return;

        const removedAttributes = removeAllAttributesFromOwner(relationData);

        removeAttributesCells(removedAttributes);

        relationData.canHoldAttributes = false;
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
                    getAttributeDataById,
                    syncDiscriminantUnderline,
                    syncMultivaluedAttributeDecorator,
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

    const handleEntityMove = (selected) => {
        const selectedEntityDiag = findEntityById(
            diagramRef.current,
            selected.id,
        );

        if (!selectedEntityDiag) return;

        syncOwnerAttributePositions(selectedEntityDiag, selected);

        if (isWeakEntity(selectedEntityDiag)) {
            syncWeakEntityDecorator(selected);
        }

        if (selectedEntityDiag?.identifyingRelationId) {
            const relationData = findRelationById(
                diagramRef.current,
                selectedEntityDiag.identifyingRelationId,
            );
            const relationCell = accessCell(relationData?.idMx);

            if (relationData && relationCell) {
                syncIdentifyingRelationEdgeDecorator(
                    relationCell,
                    relationData,
                );
            }
        }

        refreshGraph();
    };

    const handleRelationMove = (selected) => {
        const selectedRelationDiag = findRelationById(
            diagramRef.current,
            selected.id,
        );

        if (!selectedRelationDiag) return;

        if (canRelationHoldAttributes(selectedRelationDiag)) {
            syncOwnerAttributePositions(selectedRelationDiag, selected);
            refreshGraph();
        }

        if (isSelfRelation(selectedRelationDiag)) {
            const target1 = accessCell(selectedRelationDiag.side1.entity.idMx);
            const source = selected;
            const edge1 = accessCell(selectedRelationDiag.side1.edgeId);
            const edge2 = accessCell(selectedRelationDiag.side2.edgeId);

            const x1 = target1.geometry.x + target1.geometry.width / 2;
            const x2 = source.geometry.x + source.geometry.width / 2;
            const y1 = target1.geometry.y + target1.geometry.height / 2;
            const y2 = source.geometry.y + source.geometry.height / 2;

            edge1.geometry.points = [new mxPoint(x2, y1)];
            edge2.geometry.points = [new mxPoint(x1, y2)];
        }
        if (isIdentifyingRelation(selectedRelationDiag)) {
            syncIdentifyingRelationDecorator(selected);
            syncIdentifyingRelationEdgeDecorator(
                selected,
                selectedRelationDiag,
            );
        }
    };

    const handleAttributeMove = (selected) => {
        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected.id,
        );

        if (!attributeOwner) return;

        const { owner, parent, attribute } = attributeOwner;
        const positionOwner = parent ?? owner;

        updateAttributePosition({
            attribute,
            owner: positionOwner,
            position: selected.geometry,
        });

        syncAttributeChildrenPositions(attribute, selected);

        if (attribute.multivalued) {
            syncMultivaluedAttributeDecorator(selected);
        }

        if (attribute.partialKey) {
            syncDiscriminantUnderline(selected);
        }
    };

    const onCellsResized = (evt) => {
        const cells = evt.getProperty("cells") || [];

        cells.forEach((cell) => {
            if (
                cell?.style?.includes("shape=rectangle") &&
                !isWeakEntityDecoratorCell(cell)
            ) {
                const entityData = findEntityById(diagramRef.current, cell.id);

                if (isWeakEntity(entityData)) {
                    syncWeakEntityDecorator(cell);
                }

                if (entityData?.identifyingRelationId) {
                    const relationData = findRelationById(
                        diagramRef.current,
                        entityData.identifyingRelationId,
                    );
                    const relationCell = accessCell(relationData?.idMx);

                    if (relationData && relationCell) {
                        syncIdentifyingRelationEdgeDecorator(
                            relationCell,
                            relationData,
                        );
                    }
                }
            }
            if (
                cell.style.includes("shape=rhombus") &&
                !isIdentifyingRelationDecoratorCell(cell)
            ) {
                const relationData = findRelationById(
                    diagramRef.current,
                    cell.id,
                );

                if (!relationData) return;

                if (isSelfRelation(relationData)) {
                    const target = accessCell(relationData.side1.entity.idMx);
                    const edge1 = accessCell(relationData.side1.edgeId);
                    const edge2 = accessCell(relationData.side2.edgeId);

                    if (target && edge1 && edge2) {
                        const x1 =
                            target.geometry.x + target.geometry.width / 2;
                        const x2 = cell.geometry.x + cell.geometry.width / 2;
                        const y1 =
                            target.geometry.y + target.geometry.height / 2;
                        const y2 = cell.geometry.y + cell.geometry.height / 2;

                        edge1.geometry.points = [new mxPoint(x2, y1)];
                        edge2.geometry.points = [new mxPoint(x1, y2)];
                    }
                }

                if (isIdentifyingRelation(relationData)) {
                    syncIdentifyingRelationDecorator(cell);
                    syncIdentifyingRelationEdgeDecorator(cell, relationData);
                }
            }
        });

        refreshGraph();
        syncAndPersistDiagramData();
    };

    const onCellsMoved = (_evt) => {
        if (selected) {
            if (
                selected?.style?.includes("shape=rectangle") &&
                !isWeakEntityDecoratorCell(selected)
            ) {
                handleEntityMove(selected);
            } else if (
                selected?.style?.includes("shape=rhombus") &&
                !isIdentifyingRelationDecoratorCell(selected)
            ) {
                handleRelationMove(selected);
            } else if (selected?.style?.includes("shape=ellipse")) {
                handleAttributeMove(selected);
            }
        }
        // Ensure that the diagram is updated before
        syncAndPersistDiagramData();
    };

    React.useEffect(() => {
        if (graph) {
            // Define the listener as a function to refer it for removal
            const handleCellsMoved = (_sender, evt) => {
                onCellsMoved(evt);
            };

            const handleCellsResized = (_sender, evt) => {
                onCellsResized(evt);
            };

            // Add the listener
            graph.addListener(mxEvent.CELLS_MOVED, handleCellsMoved);
            graph.addListener(mxEvent.CELLS_RESIZED, handleCellsResized);

            syncAndPersistDiagramData();

            // Cleanup function to remove the listener
            return () => {
                graph.removeListener(handleCellsMoved);
                graph.removeListener(handleCellsResized);
            };
        }
    }, [graph, selected, diagramRef, refreshDiagram]);

    const pushCellsBack = (moveBack) => () => {
        graph.orderCells(moveBack);
    };

    const createAttributeVertex = ({
        name,
        source,
        offsetX,
        offsetY,
        semantics,
    }) => {
        const newX = source.geometry.x + offsetX;
        const newY = source.geometry.y + offsetY;

        const attributeForRendering = {
            name,
            ...semantics,
        };

        const { width, height } = getAttributeRenderDimensions(
            attributeForRendering,
            getAttributeDimensions,
        );

        const target = graph.insertVertex(
            null,
            null,
            getAttributeDisplayValue(attributeForRendering),
            newX,
            newY,
            width,
            height,
            getAttributeStyleString(attributeForRendering),
        );

        const edge = graph.insertEdge(source, null, null, source, target);

        graph.orderCells(false);

        if (semantics.multivalued) {
            ensureMultivaluedAttributeDecorator(target);
        }

        if (semantics.partialKey) {
            ensureDiscriminantUnderline(target);
        }

        return { target, edge };
    };

    const addAttribute = () => {
        let selectedDiag;
        let isRelation = false;
        if (
            selected?.style?.includes("shape=rectangle") &&
            !isWeakEntityDecoratorCell(selected)
        ) {
            selectedDiag = findEntityById(diagramRef.current, selected.id);
        } else if (selected?.style?.includes("shape=rhombus")) {
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

        const { target, edge } = createAttributeVertex({
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

    const canAddChildAttributeToSelectedAttribute = (attributeOwner) => {
        const { attribute, depth } = attributeOwner;

        if (!isMultivaluedAttribute(attribute)) {
            return true;
        }

        return (
            isEntityAttributeOwner(attributeOwner) &&
            depth === 0 &&
            !attribute.key &&
            !attribute.partialKey
        );
    };

    const addChildAttribute = () => {
        if (!selected?.style?.includes("shape=ellipse")) return;

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected.id,
        );

        if (!attributeOwner) return;

        const parentAttribute = attributeOwner.attribute;

        if (!canAddChildAttributeToSelectedAttribute(attributeOwner)) {
            toast.error(
                "Solo se pueden crear atributos multivaluados compuestos en atributos top-level de entidad.",
            );
            return;
        }

        const childAttributes = parentAttribute.children ?? [];

        const semantics = {
            key: false,
            partialKey: false,
        };

        const source = selected;

        let offsetX = 120;
        let offsetY = -40;

        const lastChildAttribute = getLastAttribute(childAttributes);

        if (lastChildAttribute) {
            const lastChildCell = graph
                .getModel()
                .getCell(lastChildAttribute.idMx);

            if (lastChildCell?.geometry) {
                offsetX = lastChildCell.geometry.x - source.geometry.x;
                offsetY = lastChildCell.geometry.y - source.geometry.y + 20;
            }
        }

        const uniqueAttributeName =
            generateUniqueAttributeName(childAttributes);

        const { target, edge } = createAttributeVertex({
            name: uniqueAttributeName,
            source,
            offsetX,
            offsetY,
            semantics,
        });

        addChildAttributeToAttribute(
            parentAttribute,
            createAttribute({
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
            }),
        );

        syncAttributeVisualRepresentation(parentAttribute);

        syncAndPersistDiagramData();
        toast.success("Subatributo insertado");
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
        const selectedEntityAttribute = getSelectedEntityAttributeData();
        if (!selectedEntityAttribute) return;

        const { entity, attribute } = selectedEntityAttribute;

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

        const result = toggleExclusivePrimaryKeyAttribute(
            entity.attributes,
            selected.id,
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
        if (!selected?.style?.includes("shape=rectangle")) return;
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
        if (!selected?.style?.includes("shape=ellipse")) return;

        const selectedEntityAttribute = getSelectedEntityAttributeData();
        if (!selectedEntityAttribute) return;

        const { entity, attribute } = selectedEntityAttribute;

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

        const result = toggleExclusivePartialKeyAttribute(
            entity.attributes,
            selected.id,
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
        if (!selected?.style?.includes("shape=rhombus")) return;

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
        if (!selected) return;
        if (!selected?.style?.includes("shape=ellipse")) return;

        const attributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            selected.id,
        );

        if (!attributeOwner) return;

        if (isRelationAttributeOwner(attributeOwner)) {
            toast.error(
                "Los atributos multivaluados en relaciones no están soportados todavía.",
            );
            return;
        }

        if (!isEntityAttributeOwner(attributeOwner)) return;

        const { attribute, depth } = attributeOwner;

        if (depth > 0) {
            return;
        }

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
            selected?.style?.includes("shape=rectangle") &&
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

    const AddChildAttributeButton = () => {
        if (!selected?.style?.includes("shape=ellipse")) {
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
                Añadir subatributo
            </button>
        );
    };

    const ConvertSubattributeToSimpleButton = () => {
        if (!selected?.style?.includes("shape=ellipse")) {
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
            selected?.style?.includes("shape=rectangle") &&
            !isWeakEntityDecoratorCell(selected);
        const isRelationNM =
            selected?.style?.includes("shape=rhombus") &&
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
        const isAttribute = selected?.style?.includes("shape=ellipse");

        if (!isAttribute) {
            return;
        }

        const selectedEntityAttribute = getSelectedEntityAttributeData();

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
        const isAttribute = selected?.style?.includes("shape=ellipse");
        const selectedEntityAttribute = getSelectedEntityAttributeData();

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
        const isAttribute = selected?.style?.includes("shape=ellipse");
        const selectedEntityAttribute = getSelectedEntityAttributeData();

        if (!isAttribute || !selectedEntityAttribute) {
            return;
        }

        const { attribute } = selectedEntityAttribute;

        if (attribute.key || attribute.partialKey) {
            return;
        }

        return (
            <button
                type="button"
                className="button-toolbar-action"
                onClick={toggleMultivaluedAttribute}
            >
                {isMultivaluedAttribute(attribute)
                    ? "Quitar multivaluado"
                    : "Marcar multivaluado"}
            </button>
        );
    };

    const ToggleWeakEntityButton = () => {
        const isEntity =
            selected?.style?.includes("shape=rectangle") &&
            !isWeakEntityDecoratorCell(selected);

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
        const isRelation = selected?.style?.includes("shape=rhombus");
        const selectedRelationDiag = getSelectedRelationData();

        if (isRelation && selectedRelationDiag) {
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
        const isRelation = selected?.style?.includes("shape=rhombus");
        const [open, setOpen] = React.useState(false);
        const [acceptDisabled, setAcceptDisabled] = React.useState(true);

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = () => {
            const source = selected;
            const relation = findRelationById(diagramRef.current, source.id);

            if (!relation) return;
            if (!side1?.idMx || !side2?.idMx) return;

            if (isIdentifyingRelation(relation)) {
                clearIdentifyingRelationSemantics(relation.idMx);
            }

            if (isRelationConfigured(relation)) {
                // Find the previous edges
                const cardinality1 = accessCell(relation.side1.idMx);
                const cardinality2 = accessCell(relation.side2.idMx);
                const edge1 = accessCell(relation.side1.edgeId);
                const edge2 = accessCell(relation.side2.edgeId);

                // Remove the previous edges from the graph
                if (cardinality1) {
                    graph.removeCells([cardinality1]);
                }
                if (cardinality2) {
                    graph.removeCells([cardinality2]);
                }
                // Remove the previous edges from the graph
                if (edge1) {
                    graph.removeCells([edge1]);
                }
                if (edge2) {
                    graph.removeCells([edge2]);
                }

                removeRelationAttributes(relation);

                resetRelationSides(relation, { cardinality: "X:X" });
            }

            const target1 = accessCell(side1.idMx);
            const target2 = accessCell(side2.idMx);

            const edge1 = graph.insertEdge(
                selected,
                null,
                null,
                source,
                target1,
            );
            const edge2 = graph.insertEdge(
                selected,
                null,
                null,
                source,
                target2,
            );
            const cardinality1 = graph.insertVertex(
                edge1,
                null,
                "X:X",
                0,
                0,
                1,
                1,
                getCardinalityStyleString(),
                true,
            );
            const cardinality2 = graph.insertVertex(
                edge2,
                null,
                "X:X",
                0,
                0,
                1,
                1,
                getCardinalityStyleString(),
                true,
            );
            graph.updateCellSize(cardinality1);
            graph.updateCellSize(cardinality2);

            const selectedDiag = findRelationById(
                diagramRef.current,
                selected?.id,
            );
            selectedDiag.side1.idMx = cardinality1.id;
            selectedDiag.side2.idMx = cardinality2.id;

            selectedDiag.side1.edgeId = edge1.id;
            selectedDiag.side2.edgeId = edge2.id;

            selectedDiag.side1.cell = cardinality1.id;
            selectedDiag.side2.cell = cardinality2.id;
            selectedDiag.side1.entity.idMx = side1.idMx;
            selectedDiag.side2.entity.idMx = side2.idMx;

            if (target1 === target2) {
                const x1 = target1.geometry.x + target1.geometry.width / 2;
                const x2 = source.geometry.x + source.geometry.width / 2;
                const y1 = target1.geometry.y + target1.geometry.height / 2;
                const y2 = source.geometry.y + source.geometry.height / 2;

                edge1.geometry.points = [new mxPoint(x2, y1)];
                edge2.geometry.points = [new mxPoint(x1, y2)];
            }
            graph.orderCells(true, [edge1, edge2]); // Move the new edges to the back

            syncAndPersistDiagramData();

            setOpen(false);
            setSide1("");
            setSide2("");
        };

        const [side1, setSide1] = React.useState("");
        const [side2, setSide2] = React.useState("");

        const handleChangeSide1 = (event) => {
            setSide1(event.target.value);
        };
        const handleChangeSide2 = (event) => {
            setSide2(event.target.value);
        };

        React.useEffect(() => {
            if (side1 !== "" && side2 !== "") {
                setAcceptDisabled(false);
            } else {
                setAcceptDisabled(true);
            }
        }, [side1, side2]);

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
                                    <InputLabel id="side1-label">
                                        Lado 1
                                    </InputLabel>
                                    <Select
                                        id="side1"
                                        value={side1}
                                        label="Age"
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
        const isRelation = selected?.style?.includes("shape=rhombus");
        const selectedDiag = findRelationById(diagramRef.current, selected?.id);
        const [open, setOpen] = React.useState(false);
        const [acceptDisabled, setAcceptDisabled] = React.useState(true);

        const handleClickOpen = () => {
            setSide1(selectedDiag?.side1?.cardinality ?? "");
            setSide2(selectedDiag?.side2?.cardinality ?? "");
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
                    selectedDiag.side1.cardinality = side1;
                    selectedDiag.side2.cardinality = "1:1";
                } else {
                    selectedDiag.side1.cardinality = "1:1";
                    selectedDiag.side2.cardinality = side2;
                }

                removeRelationAttributes(selectedDiag);
            } else {
                selectedDiag.side1.cardinality = side1;
                selectedDiag.side2.cardinality = side2;

                if (isManyToManyRelation(selectedDiag)) {
                    selectedDiag.canHoldAttributes = true;
                } else {
                    removeRelationAttributes(selectedDiag);
                }
            }

            syncRelationCardinalityLabels(selectedDiag);
            refreshGraph();

            setSide1("");
            setSide2("");
            setOpen(false);
            syncAndPersistDiagramData();
        };

        const [side1, setSide1] = React.useState("");
        const [side2, setSide2] = React.useState("");

        const handleChangeSide1 = (event) => {
            setSide1(event.target.value);
        };
        const handleChangeSide2 = (event) => {
            setSide2(event.target.value);
        };

        React.useEffect(() => {
            if (side1 !== "" && side2 !== "") {
                setAcceptDisabled(false);
            } else {
                setAcceptDisabled(true);
            }
        }, [side1, side2]);

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

        const getAllowedCardinalitiesForSide = (sideKey) => {
            if (!isIdentifyingRelation(selectedDiag)) {
                return POSSIBLE_CARDINALITIES;
            }

            const isWeakSide = sideKey === "side1" ? side1IsWeak : side2IsWeak;

            if (isWeakSide) {
                return ["0:N", "1:N"];
            }

            return ["1:1"];
        };

        if (isRelation) {
            const isConfigured = isRelationConfigured(selectedDiag);

            const side1EntityName =
                accessCell(selectedDiag?.side1?.entity?.idMx)?.value ??
                "Lado 1";

            const side2EntityName =
                accessCell(selectedDiag?.side2?.entity?.idMx)?.value ??
                "Lado 2";

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
                                    Escoger los lados de esta relación
                                </DialogContentText>
                                <Box sx={{ minHeight: 10 }} />
                                <Box sx={{ minWidth: 120 }}>
                                    <FormControl fullWidth>
                                        <InputLabel id="side1-to-side2-label">
                                            {side1EntityName}
                                        </InputLabel>
                                        <Select
                                            id="side1-to-side2"
                                            value={side1}
                                            label={side1EntityName}
                                            onChange={handleChangeSide1}
                                            disabled={
                                                isIdentifyingRelation(
                                                    selectedDiag,
                                                ) && side1IsStrong
                                            }
                                        >
                                            {getAllowedCardinalitiesForSide(
                                                "side1",
                                            ).map((cardinality) => (
                                                <MenuItem
                                                    key={cardinality}
                                                    value={cardinality}
                                                >
                                                    {cardinality}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <Box sx={{ minHeight: 10 }} />
                                    <FormControl fullWidth>
                                        <InputLabel id="side2-to-side1-label">
                                            {side2EntityName}
                                        </InputLabel>
                                        <Select
                                            id="side2-to-side1"
                                            value={side2}
                                            label={side2EntityName}
                                            onChange={handleChangeSide2}
                                            disabled={
                                                isIdentifyingRelation(
                                                    selectedDiag,
                                                ) && side2IsStrong
                                            }
                                        >
                                            {getAllowedCardinalitiesForSide(
                                                "side2",
                                            ).map((cardinality) => (
                                                <MenuItem
                                                    key={cardinality}
                                                    value={cardinality}
                                                >
                                                    {cardinality}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
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
            selected?.style?.includes("shape=rectangle") &&
            !isWeakEntityDecoratorCell(selected);
        function deleteEntity() {
            // Find the entity in diagramRef.current.entities
            const entityIndex = findEntityIndexById(
                diagramRef.current,
                selected.id,
            );

            if (entityIndex !== -1) {
                const entity = diagramRef.current.entities[entityIndex];

                // Remove the entity from diagramRef.current.entities
                diagramRef.current.entities.splice(entityIndex, 1);

                // Find the corresponding cell in graph.model.cells
                const cell = accessCell(entity.idMx);
                const weakDecorator = isWeakEntity(entity)
                    ? accessCell(getWeakEntityDecoratorId(entity.idMx))
                    : null;
                if (cell) {
                    // Collect the attribute cells to delete
                    const attributeCells = getAttributesCells(
                        entity.attributes,
                    );

                    // Remove the entity's cell and its attributes from the graph
                    graph.removeCells(
                        weakDecorator
                            ? [weakDecorator, cell, ...attributeCells]
                            : [cell, ...attributeCells],
                    );
                    // Check and remove relations involving this entity
                    diagramRef.current.relations.forEach((relation, index) => {
                        if (relationInvolvesEntity(relation, entity.idMx)) {
                            clearIdentifyingRelationSemantics(relation.idMx);

                            // Find the corresponding cells in graph.model.cells for the relation
                            const side1Cell = accessCell(relation.side1.cell);
                            const side2Cell = accessCell(relation.side2.cell);
                            const edge1Cell = accessCell(relation.side1.edgeId);
                            const edge2Cell = accessCell(relation.side2.edgeId);

                            // Collect the relation's attribute cells to delete
                            const relationAttributeCells = getAttributesCells(
                                relation.attributes,
                            );

                            // Remove the relation's cells and its attributes from the graph
                            graph.removeCells([
                                side1Cell,
                                side2Cell,
                                edge1Cell,
                                edge2Cell,
                                ...relationAttributeCells,
                            ]);

                            // Reinitialize the relation sides
                            resetRelationSides(
                                diagramRef.current.relations[index],
                            );
                        }
                    });
                }
            }
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

    const removeAttributeConnectionEdges = (attribute) => {
        const edgeCells = (attribute?.cell ?? [])
            .slice(1)
            .map((cellId) => accessCell(cellId))
            .filter(Boolean);

        if (edgeCells.length > 0) {
            graph.removeCells(edgeCells);
        }
    };

    const reparentPromotedAttributeCell = (attribute) => {
        if (!attribute?.idMx) return;

        const promotedAttributeOwner = findAttributeTreeOwnerById(
            diagramRef.current,
            attribute.idMx,
        );

        if (!promotedAttributeOwner) return;

        const promotedAttributeCell = accessCell(attribute.idMx);
        const sourceCell = accessCell(
            promotedAttributeOwner.parent?.idMx ??
                promotedAttributeOwner.owner?.idMx,
        );

        if (!promotedAttributeCell || !sourceCell) return;

        const edge = graph.insertEdge(
            sourceCell,
            null,
            null,
            sourceCell,
            promotedAttributeCell,
        );

        attribute.cell = [promotedAttributeCell.id, edge.id];

        updateAttributePosition({
            attribute,
            owner:
                promotedAttributeOwner.parent ?? promotedAttributeOwner.owner,
            position: promotedAttributeCell.geometry,
        });

        graph.orderCells(true, [edge]);
        syncAttributeVisualRepresentation(attribute);
    };

    const canConvertSelectedSubattributeToSimpleAttribute = (
        attributeOwner,
    ) => {
        return attributeOwner?.parent && attributeOwner.depth === 1;
    };

    const convertSelectedSubattributeToSimpleAttribute = () => {
        if (!selected?.style?.includes("shape=ellipse")) return;

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

        convertedAttributes.forEach(reparentPromotedAttributeCell);

        syncAndPersistDiagramData();

        toast.success(
            convertedAttributes.length > 1
                ? "Subatributos convertidos en atributos simples"
                : "Subatributo convertido en atributo simple",
        );
    };

    const DeleteAttributeButton = () => {
        const isAttribute = selected?.style?.includes("shape=ellipse");

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

            reparentPromotedAttributeCell(promotedAttribute);

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
        const isRelation = selected?.style?.includes("shape=rhombus");

        function deleteRelation() {
            // Find the relation in diagramRef.current.relations
            const relationIndex = findRelationIndexById(
                diagramRef.current,
                selected.id,
            );

            if (relationIndex !== -1) {
                const relation = diagramRef.current.relations[relationIndex];

                clearIdentifyingRelationSemantics(relation.idMx);

                // Remove the relation from diagramRef.current.relations
                diagramRef.current.relations.splice(relationIndex, 1);

                const cell = accessCell(relation.idMx);

                if (cell) {
                    // Remove the attributes associated with the entity
                    const attributeCells = getAttributesCells(
                        relation.attributes,
                    );

                    // Remove the cell and its attributes from the graph
                    graph.removeCells([cell, ...attributeCells]);
                }
            }
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
