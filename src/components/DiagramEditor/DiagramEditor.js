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
    addAttributeToOwner,
    canRelationHoldAttributes,
    convertPartialKeyToPrimaryKey,
    convertPrimaryKeyToPartialKey,
    createAttribute,
    findAttributeOwnerById,
    findEntitiesByIdentifyingRelationId,
    findEntityById,
    findEntityIndexById,
    findRelationById,
    findRelationIndexById,
    findWeakEntityByIdentifyingRelationId,
    generateUniqueAttributeName,
    getDefaultAttributeSemantics,
    getLastAttribute,
    isEntityAttributeOwner,
    isFirstAttributeForOwner,
    isIdentifyingRelation,
    isManyToManyRelation,
    isPrimaryKeyAttribute,
    isRelationAttributeOwner,
    isRelationConfigured,
    isSelfRelation,
    isWeakEntity,
    normalizeDiagramData,
    relationHasBothEntitySides,
    relationInvolvesEntity,
    removeAllAttributesFromOwner,
    removeAttributeFromOwnerById,
    toggleExclusivePartialKeyAttribute,
    toggleExclusivePrimaryKeyAttribute,
    updateAttributePosition,
} from "../../domain/er";
import { generateSQL } from "../../utils/sql";
import { POSSIBLE_CARDINALITIES, validateGraph } from "../../utils/validation";
import { setInitialConfiguration } from "./utils";
import {
    DISCRIMINANT_UNDERLINE_SUFFIX,
    createAttributeRenderingHelpers,
    getAttributeStyleString,
    isDiscriminantUnderlineCell,
} from "./utils/attributeRendering";
import {
    ER_FONT,
    ER_STROKE,
    getAttributeDimensions,
    getCardinalityStyleString,
    getEntityDimensions,
    getEntityStyleString,
    getRelationDimensions,
    getRelationStyleString,
} from "./utils/diagramStyles";
import {
    WEAK_ENTITY_DECORATOR_SUFFIX,
    createEntityRenderingHelpers,
    isWeakEntityDecoratorCell,
} from "./utils/entityRendering";

const { mxGraph, mxEvent, mxConstants, mxPoint, mxGeometry } = MxGraph();

export default function App(props) {
    // Apply font underline to the key attribute label text
    const keyAttrStyle = {};
    keyAttrStyle[mxConstants.STYLE_FONTSTYLE] = mxConstants.FONT_UNDERLINE;

    // Define a style that makes a cell non-resizable and non-movable
    const notResizeableStyle = {};
    notResizeableStyle[mxConstants.STYLE_RESIZABLE] = 0; // Makes the cell non-resizable

    const weakEntityDecoratorStyle = {};
    weakEntityDecoratorStyle[mxConstants.STYLE_FILLCOLOR] = "none";
    weakEntityDecoratorStyle[mxConstants.STYLE_STROKECOLOR] = ER_STROKE;
    weakEntityDecoratorStyle[mxConstants.STYLE_STROKEWIDTH] = 2;
    weakEntityDecoratorStyle[mxConstants.STYLE_MOVABLE] = 0;
    weakEntityDecoratorStyle[mxConstants.STYLE_RESIZABLE] = 0;
    weakEntityDecoratorStyle[mxConstants.STYLE_EDITABLE] = 0;
    weakEntityDecoratorStyle[mxConstants.STYLE_ROTABLE] = 0;
    weakEntityDecoratorStyle[mxConstants.STYLE_POINTER_EVENTS] = 0;

    const identifyingRelationDecoratorStyle = {};
    identifyingRelationDecoratorStyle[mxConstants.STYLE_FILLCOLOR] = "none";
    identifyingRelationDecoratorStyle[mxConstants.STYLE_STROKECOLOR] =
        ER_STROKE;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_STROKEWIDTH] = 2;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_MOVABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_RESIZABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_EDITABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_ROTABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_POINTER_EVENTS] = 0;

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
        const diagramData = JSON.stringify(
            normalizeDiagramData(diagramRef.current),
        );
        localStorage.setItem("diagramData", diagramData);
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
        getAttributesCells,
        removeAttributesCells,
        syncOwnerAttributePositions,
        syncDiscriminantUnderline,
        ensureDiscriminantUnderline,
        syncAttributeVisualRepresentation,
        setOwnerAttributesVisible,
    } = createAttributeRenderingHelpers({
        graph,
        accessCell,
        mxPoint,
        mxGeometry,
    });

    const IDENTIFYING_RELATION_DECORATOR_SUFFIX = "__identifying_decorator";
    const IDENTIFYING_RELATION_DECORATOR_OFFSET = 4;
    const IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX =
        "__identifying_weak_edge_decorator";
    const IDENTIFYING_RELATION_EDGE_PARALLEL_GAP = 5;

    const isIdentifyingRelationDecoratorCell = (cell) =>
        !!cell?.id &&
        String(cell.id).endsWith(IDENTIFYING_RELATION_DECORATOR_SUFFIX);

    const syncIdentifyingRelationDecorator = (relationCell) => {
        if (!relationCell) return;

        const decorator = accessCell(
            getIdentifyingRelationDecoratorId(relationCell.id),
        );
        if (!decorator || !decorator.geometry || !relationCell.geometry) return;

        decorator.geometry.x =
            relationCell.geometry.x + IDENTIFYING_RELATION_DECORATOR_OFFSET;
        decorator.geometry.y =
            relationCell.geometry.y + IDENTIFYING_RELATION_DECORATOR_OFFSET;
        decorator.geometry.width = Math.max(
            1,
            relationCell.geometry.width -
                IDENTIFYING_RELATION_DECORATOR_OFFSET * 2,
        );
        decorator.geometry.height = Math.max(
            1,
            relationCell.geometry.height -
                IDENTIFYING_RELATION_DECORATOR_OFFSET * 2,
        );

        graph.refresh(decorator);
        graph.orderCells(false, [decorator]);
    };

    const getIdentifyingRelationDecoratorId = (relationId) =>
        `${relationId}${IDENTIFYING_RELATION_DECORATOR_SUFFIX}`;

    const createIdentifyingRelationDecorator = (relation) => {
        const { width, height } = getRelationDimensions(relation.name);
        return graph.insertVertex(
            null,
            getIdentifyingRelationDecoratorId(relation.idMx),
            "",
            relation.position.x + IDENTIFYING_RELATION_DECORATOR_OFFSET,
            relation.position.y + IDENTIFYING_RELATION_DECORATOR_OFFSET,
            Math.max(1, width - IDENTIFYING_RELATION_DECORATOR_OFFSET * 2),
            Math.max(1, height - IDENTIFYING_RELATION_DECORATOR_OFFSET * 2),
            "identifyingRelationDecoratorStyle;shape=rhombus",
        );
    };
    const ensureIdentifyingRelationDecorator = (relationCell, relationData) => {
        const existingDecorator = accessCell(
            getIdentifyingRelationDecoratorId(relationCell.id),
        );

        if (existingDecorator) {
            syncIdentifyingRelationDecorator(relationCell);
            return;
        }

        createIdentifyingRelationDecorator(relationData);
        syncIdentifyingRelationDecorator(relationCell);
    };

    const removeIdentifyingRelationDecorator = (relationId) => {
        const decorator = accessCell(
            getIdentifyingRelationDecoratorId(relationId),
        );
        if (decorator) {
            graph.removeCells([decorator]);
        }
    };

    const clearIdentifyingRelationSemantics = (relationId) => {
        if (!relationId) return;

        const relation = findRelationById(diagramRef.current, relationId);

        if (relation) {
            relation.isIdentifying = false;
            removeIdentifyingRelationDecorator(relation.idMx);
            removeIdentifyingRelationEdgeDecorator(relation.idMx);

            const relationCell = accessCell(relation.idMx);
            if (relationCell) {
                graph
                    .getModel()
                    .setStyle(relationCell, getRelationStyleString(relation));
            }
        }

        findEntitiesByIdentifyingRelationId(
            diagramRef.current,
            relationId,
        ).forEach((entity) => {
            entity.identifyingRelationId = null;
            entity.ownerEntityId = null;
        });
    };
    const isIdentifyingRelationEdgeDecoratorCell = (cell) =>
        !!cell?.id &&
        String(cell.id).endsWith(IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX);

    const getIdentifyingRelationEdgeDecoratorId = (relationId) =>
        `${relationId}${IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX}`;

    const getWeakEntityForIdentifyingRelation = (relation) =>
        findWeakEntityByIdentifyingRelationId(
            diagramRef.current,
            relation?.idMx,
        );

    const getWeakSideOfIdentifyingRelation = (relationData) => {
        const weakEntity = getWeakEntityForIdentifyingRelation(relationData);
        if (!weakEntity) return null;

        if (relationData?.side1?.entity?.idMx === weakEntity.idMx) {
            return relationData.side1;
        }

        if (relationData?.side2?.entity?.idMx === weakEntity.idMx) {
            return relationData.side2;
        }

        return null;
    };

    const getWeakAndStrongSidesForRelation = (relationData) => {
        const emptyResult = {
            weakEntity: null,
            strongEntity: null,
            weakSide: null,
            strongSide: null,
        };

        if (!relationData) {
            return emptyResult;
        }

        const side1Entity =
            findEntityById(
                diagramRef.current,
                relationData?.side1?.entity?.idMx,
            ) ?? null;

        const side2Entity =
            findEntityById(
                diagramRef.current,
                relationData?.side2?.entity?.idMx,
            ) ?? null;

        if (!side1Entity || !side2Entity) {
            return emptyResult;
        }

        // Identifying relationships may not be reflexive: a weak entity cannot
        // identify itself.
        if (side1Entity.idMx === side2Entity.idMx) {
            return emptyResult;
        }

        const makeResult = (weakEntity, ownerEntity, weakSide, ownerSide) => ({
            weakEntity,
            // Keep the historical names so the rest of the component needs the
            // smallest possible change. In cascaded weak entities this value is
            // the owner entity, not necessarily a strong one.
            strongEntity: ownerEntity,
            weakSide,
            strongSide: ownerSide,
        });

        const side1IsWeak = isWeakEntity(side1Entity);
        const side2IsWeak = isWeakEntity(side2Entity);

        if (side1IsWeak && !side2IsWeak) {
            return makeResult(
                side1Entity,
                side2Entity,
                relationData.side1,
                relationData.side2,
            );
        }

        if (!side1IsWeak && side2IsWeak) {
            return makeResult(
                side2Entity,
                side1Entity,
                relationData.side2,
                relationData.side1,
            );
        }

        if (!side1IsWeak && !side2IsWeak) {
            return emptyResult;
        }

        // Both sides are weak. If one of them is already identified by a
        // previous owner, it can act as the owner in a cascaded dependency.
        // The other weak entity becomes the new dependent entity.
        if (side1IsWeak && side2IsWeak) {
            const side1AlreadyHasOwner =
                !!side1Entity.identifyingRelationId &&
                !!side1Entity.ownerEntityId;

            const side2AlreadyHasOwner =
                !!side2Entity.identifyingRelationId &&
                !!side2Entity.ownerEntityId;

            const side1CanBecomeDependent =
                !side1Entity.identifyingRelationId ||
                side1Entity.identifyingRelationId === relationData.idMx;

            const side2CanBecomeDependent =
                !side2Entity.identifyingRelationId ||
                side2Entity.identifyingRelationId === relationData.idMx;

            if (side1AlreadyHasOwner && side2CanBecomeDependent) {
                return makeResult(
                    side2Entity,
                    side1Entity,
                    relationData.side2,
                    relationData.side1,
                );
            }

            if (side2AlreadyHasOwner && side1CanBecomeDependent) {
                return makeResult(
                    side1Entity,
                    side2Entity,
                    relationData.side1,
                    relationData.side2,
                );
            }
        }

        // Both sides are weak: this is valid only for cascaded weak entities.
        // Infer the dependent weak side from the existing cardinalities. The
        // dependent side must be N, and the owner side must be 1.
        const side1Maximum = relationData.side1?.cardinality?.split(":")?.[1];
        const side2Maximum = relationData.side2?.cardinality?.split(":")?.[1];

        if (side1Maximum === "N" && side2Maximum === "1") {
            return makeResult(
                side1Entity,
                side2Entity,
                relationData.side1,
                relationData.side2,
            );
        }

        if (side2Maximum === "N" && side1Maximum === "1") {
            return makeResult(
                side2Entity,
                side1Entity,
                relationData.side2,
                relationData.side1,
            );
        }

        // If the relation is already marked as identifying, the dependent side
        // can also be recovered from the entity metadata.
        if (
            side1Entity.identifyingRelationId === relationData.idMx &&
            side2Entity.identifyingRelationId !== relationData.idMx
        ) {
            return makeResult(
                side1Entity,
                side2Entity,
                relationData.side1,
                relationData.side2,
            );
        }

        if (
            side2Entity.identifyingRelationId === relationData.idMx &&
            side1Entity.identifyingRelationId !== relationData.idMx
        ) {
            return makeResult(
                side2Entity,
                side1Entity,
                relationData.side2,
                relationData.side1,
            );
        }

        return emptyResult;
    };

    const getCascadedWeakConversionCandidate = (relationData) => {
        if (!relationData) return null;

        const side1Entity =
            findEntityById(
                diagramRef.current,
                relationData?.side1?.entity?.idMx,
            ) ?? null;

        const side2Entity =
            findEntityById(
                diagramRef.current,
                relationData?.side2?.entity?.idMx,
            ) ?? null;

        if (!side1Entity || !side2Entity) {
            return null;
        }

        if (side1Entity.idMx === side2Entity.idMx) {
            return null;
        }

        // This helper only handles the UX case where both entities are still strong.
        if (isWeakEntity(side1Entity) || isWeakEntity(side2Entity)) {
            return null;
        }

        const side1OwnsWeakEntities = diagramRef.current.entities.some(
            (entity) =>
                isWeakEntity(entity) &&
                entity.ownerEntityId === side1Entity.idMx &&
                !!entity.identifyingRelationId,
        );

        const side2OwnsWeakEntities = diagramRef.current.entities.some(
            (entity) =>
                isWeakEntity(entity) &&
                entity.ownerEntityId === side2Entity.idMx &&
                !!entity.identifyingRelationId,
        );

        // If none or both can be inferred, do not guess.
        if (side1OwnsWeakEntities === side2OwnsWeakEntities) {
            return null;
        }

        if (side1OwnsWeakEntities) {
            return {
                weakEntity: side1Entity,
                ownerEntity: side2Entity,
            };
        }

        return {
            weakEntity: side2Entity,
            ownerEntity: side1Entity,
        };
    };

    const getParallelTerminalPointsFromMainEdge = (mainEdge) => {
        if (!mainEdge) return null;

        const source = graph.getModel().getTerminal(mainEdge, true);
        const target = graph.getModel().getTerminal(mainEdge, false);

        if (source) {
            graph.view.invalidate(source);
        }

        if (target) {
            graph.view.invalidate(target);
        }

        graph.view.invalidate(mainEdge);
        graph.view.validate();

        const state = graph.view.getState(mainEdge);
        const absolutePoints = state?.absolutePoints?.filter(Boolean);

        if (!absolutePoints || absolutePoints.length < 2) return null;

        const start = absolutePoints[0];
        const end = absolutePoints[absolutePoints.length - 1];

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy) || 1;

        const normalX = -dy / length;
        const normalY = dx / length;

        return {
            source: new mxPoint(
                start.x + normalX * IDENTIFYING_RELATION_EDGE_PARALLEL_GAP,
                start.y + normalY * IDENTIFYING_RELATION_EDGE_PARALLEL_GAP,
            ),
            target: new mxPoint(
                end.x + normalX * IDENTIFYING_RELATION_EDGE_PARALLEL_GAP,
                end.y + normalY * IDENTIFYING_RELATION_EDGE_PARALLEL_GAP,
            ),
        };
    };

    const createIdentifyingRelationEdgeDecorator = (
        relationCell,
        relationData,
    ) => {
        const weakSide = getWeakSideOfIdentifyingRelation(relationData);
        const mainEdge = accessCell(weakSide?.edgeId);

        if (!mainEdge) return null;

        const parallelPoints = getParallelTerminalPointsFromMainEdge(mainEdge);
        if (!parallelPoints) return null;

        const edge = graph.insertEdge(
            null,
            getIdentifyingRelationEdgeDecoratorId(relationData.idMx),
            null,
            null,
            null,
            [
                `strokeColor=${ER_STROKE}`,
                "strokeWidth=1",
                "endArrow=none",
                "dashed=0",
                "editable=0",
                "movable=0",
                "resizable=0",
                "rounded=0",
                "pointerEvents=0",
                "edgeStyle=none",
            ].join(";"),
        );

        if (!edge.geometry) {
            edge.geometry = new mxGeometry();
        }

        edge.geometry.relative = false;
        edge.geometry.points = null;
        edge.geometry.setTerminalPoint(parallelPoints.source, true);
        edge.geometry.setTerminalPoint(parallelPoints.target, false);

        graph.orderCells(true, [edge]);
        return edge;
    };

    const syncIdentifyingRelationEdgeDecorator = (
        relationCell,
        relationData,
    ) => {
        const edge = accessCell(
            getIdentifyingRelationEdgeDecoratorId(relationData.idMx),
        );
        const weakSide = getWeakSideOfIdentifyingRelation(relationData);
        const mainEdge = accessCell(weakSide?.edgeId);

        if (!edge || !mainEdge) return;

        const parallelPoints = getParallelTerminalPointsFromMainEdge(mainEdge);
        if (!parallelPoints) return;

        graph.getModel().beginUpdate();
        try {
            graph.getModel().setTerminal(edge, null, true);
            graph.getModel().setTerminal(edge, null, false);

            const geometry = edge.geometry
                ? edge.geometry.clone()
                : new mxGeometry();

            geometry.relative = false;
            geometry.points = null;
            geometry.setTerminalPoint(parallelPoints.source, true);
            geometry.setTerminalPoint(parallelPoints.target, false);

            graph.getModel().setGeometry(edge, geometry);
        } finally {
            graph.getModel().endUpdate();
        }

        graph.refresh(edge);
        graph.orderCells(true, [edge]);
    };

    const ensureIdentifyingRelationEdgeDecorator = (
        relationCell,
        relationData,
    ) => {
        const existingEdge = accessCell(
            getIdentifyingRelationEdgeDecoratorId(relationData.idMx),
        );

        if (existingEdge) {
            syncIdentifyingRelationEdgeDecorator(relationCell, relationData);
            return;
        }

        createIdentifyingRelationEdgeDecorator(relationCell, relationData);
        syncIdentifyingRelationEdgeDecorator(relationCell, relationData);
    };

    const removeIdentifyingRelationEdgeDecorator = (relationId) => {
        const edge = accessCell(
            getIdentifyingRelationEdgeDecoratorId(relationId),
        );
        if (edge) {
            graph.removeCells([edge]);
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

    const applyIdentifyingRelationCardinalities = (relationData) => {
        const { weakSide, strongSide } =
            getWeakAndStrongSidesForRelation(relationData);

        if (!weakSide || !strongSide) {
            return false;
        }

        weakSide.cardinality = "0:N";
        strongSide.cardinality = "1:1";

        removeRelationAttributes(relationData);
        syncRelationCardinalityLabels(relationData);

        return true;
    };

    const removeRelationAttributes = (relationData) => {
        if (!relationData) return;

        const removedAttributes = removeAllAttributesFromOwner(relationData);

        removeAttributesCells(removedAttributes);

        relationData.canHoldAttributes = false;
    };

    const getAttributeDataById = (attributeId) =>
        findAttributeOwnerById(diagramRef.current, attributeId)?.attribute ??
        null;

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
    const recreateGraphFromLocalStorage = () => {
        const recreateAttribute = (attribute, source) => {
            let target;
            let edge;
            const { width, height } = getAttributeDimensions(attribute.name);
            // Recreate attribute
            target = graph.insertVertex(
                null,
                attribute.idMx,
                attribute.name,
                attribute.position.x,
                attribute.position.y,
                width,
                height,
                getAttributeStyleString(attribute),
            );

            const storedEdgeId = attribute.cell?.at(1) ?? null;

            edge = graph.insertEdge(source, storedEdgeId, null, source, target);

            attribute.cell = [target.id, edge.id];

            if (attribute.partialKey) {
                ensureDiscriminantUnderline(target);
            }

            graph.orderCells(true, [edge]); // Move front the selected entity so the new vertex aren't on top
        };
        const recreateEntity = (entity) => {
            const { width, height } = getEntityDimensions(entity.name);

            const source = graph.insertVertex(
                null,
                entity.idMx,
                entity.name,
                entity.position.x,
                entity.position.y,
                width,
                height,
                getEntityStyleString(),
            );

            if (isWeakEntity(entity)) {
                const decorator = createWeakEntityDecorator(entity);
                graph.orderCells(false, [decorator]); // Move front the selected entity so the new vertex aren't on top
            }

            for (const attribute of entity.attributes) {
                recreateAttribute(attribute, source);
            }
        };

        const recreateRelation = (relation) => {
            const { width, height } = getRelationDimensions(relation.name);

            const source = graph.insertVertex(
                null,
                relation.idMx,
                relation.name,
                relation.position.x,
                relation.position.y,
                width,
                height,
                getRelationStyleString(relation),
            );

            if (isIdentifyingRelation(relation)) {
                ensureIdentifyingRelationDecorator(source, relation);
            }

            for (const attribute of relation.attributes) {
                recreateAttribute(attribute, source);
            }

            if (isRelationConfigured(relation)) {
                const target1 = accessCell(relation.side1.entity.idMx);
                const target2 = accessCell(relation.side2.entity.idMx);

                const edge1 = graph.insertEdge(
                    source,
                    relation.side1.edgeId, // id
                    null,
                    source,
                    target1,
                );
                const edge2 = graph.insertEdge(
                    source,
                    relation.side2.edgeId, // id
                    null,
                    source,
                    target2,
                );
                const cardinality1 = graph.insertVertex(
                    edge1,
                    relation.side1.cell,
                    relation.side1.cardinality === ""
                        ? "X:X"
                        : relation.side1.cardinality,
                    0,
                    0,
                    1,
                    1,
                    getCardinalityStyleString(),
                    true,
                );
                const cardinality2 = graph.insertVertex(
                    edge2,
                    relation.side2.cell,
                    relation.side2.cardinality === ""
                        ? "X:X"
                        : relation.side2.cardinality,
                    0,
                    0,
                    1,
                    1,
                    getCardinalityStyleString(),
                    true,
                );
                graph.updateCellSize(cardinality1);
                graph.updateCellSize(cardinality2);
                if (target1 && target2) {
                    if (target1.id === target2.id) {
                        const x1 =
                            target1.geometry.x + target1.geometry.width / 2;
                        const x2 =
                            source.geometry.x + source.geometry.width / 2;
                        const y1 =
                            target1.geometry.y + target1.geometry.height / 2;
                        const y2 =
                            source.geometry.y + source.geometry.height / 2;

                        edge1.geometry.points = [new mxPoint(x2, y1)];
                        edge2.geometry.points = [new mxPoint(x1, y2)];
                    }
                }
                if (isIdentifyingRelation(relation)) {
                    ensureIdentifyingRelationEdgeDecorator(source, relation);
                }
                graph.orderCells(true, [edge1, edge2]); // Move front the selected entity so the new vertex aren't on top
            }
        };

        // Recreate the graph
        if (localStorage.getItem("diagramData")) {
            const savedData = JSON.parse(localStorage.getItem("diagramData"));
            diagramRef.current = normalizeDiagramData(savedData); // Deep clone the saved data

            for (const entity of diagramRef.current.entities) {
                recreateEntity(entity);
            }

            for (const relation of diagramRef.current.relations) {
                recreateRelation(relation);
            }
        }
    };

    React.useEffect(() => {
        if (!graph) {
            mxEvent.disableContextMenu(containerRef.current);
            setGraph(new mxGraph(containerRef.current));
        }
        if (graph) {
            // Override the isCellSelectable function
            mxGraph.prototype.isCellSelectable = function (cell) {
                if (
                    this.model.isEdge(cell) ||
                    isWeakEntityDecoratorCell(cell) ||
                    isIdentifyingRelationDecoratorCell(cell) ||
                    isIdentifyingRelationEdgeDecoratorCell(cell) ||
                    isDiscriminantUnderlineCell(cell)
                ) {
                    return false;
                }
                // Default behavior for other cells
                return this.isCellsSelectable() && !this.isCellLocked(cell);
            };

            // Expose mxGraph instance only for Playwright E2E
            if (typeof window !== "undefined" && window.__PW__) {
                window.__DEBUG_GRAPH__ = graph;
            }

            setInitialConfiguration(graph, diagramRef, toolbarRef);

            graph.getSelectionModel().addListener(mxEvent.CHANGE, onSelected);

            const defaultEdgeStyle = graph
                .getStylesheet()
                .getDefaultEdgeStyle();
            defaultEdgeStyle[mxConstants.STYLE_ENDARROW] = "";
            defaultEdgeStyle[mxConstants.STYLE_STROKECOLOR] = ER_STROKE;
            defaultEdgeStyle[mxConstants.STYLE_FONTCOLOR] = ER_FONT;
            defaultEdgeStyle[mxConstants.STYLE_PERIMETER_SPACING] = 0;
            defaultEdgeStyle[mxConstants.STYLE_SOURCE_PERIMETER_SPACING] = 0;
            defaultEdgeStyle[mxConstants.STYLE_TARGET_PERIMETER_SPACING] = 0;

            graph.getStylesheet().putCellStyle("keyAttrStyle", keyAttrStyle);
            graph
                .getStylesheet()
                .putCellStyle(
                    "weakEntityDecoratorStyle",
                    weakEntityDecoratorStyle,
                );
            graph
                .getStylesheet()
                .putCellStyle(
                    "identifyingRelationDecoratorStyle",
                    identifyingRelationDecoratorStyle,
                );
            graph
                .getStylesheet()
                .putCellStyle("notResizeableStyle", notResizeableStyle);

            const originalCellLabelChanged = graph.cellLabelChanged;

            graph.cellLabelChanged = function (cell, newValue, autoSize) {
                originalCellLabelChanged.call(this, cell, newValue, autoSize);

                if (!cell?.style) return;

                this.getModel().beginUpdate();
                try {
                    if (cell.style.includes("shape=ellipse")) {
                        const { width, height } =
                            getAttributeDimensions(newValue);
                        cell.geometry.width = width;
                        cell.geometry.height = height;
                        const attributeData = getAttributeDataById(cell.id);
                        if (attributeData?.partialKey) {
                            syncDiscriminantUnderline(cell);
                        }
                    } else if (
                        cell.style.includes("shape=rectangle") &&
                        !isWeakEntityDecoratorCell(cell)
                    ) {
                        const { width, height } = getEntityDimensions(newValue);
                        cell.geometry.width = width;
                        cell.geometry.height = height;

                        const entityData = findEntityById(
                            diagramRef.current,
                            cell.id,
                        );

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
                    } else if (
                        cell.style.includes("shape=rhombus") &&
                        !isIdentifyingRelationDecoratorCell(cell)
                    ) {
                        const { width, height } =
                            getRelationDimensions(newValue);
                        cell.geometry.width = width;
                        cell.geometry.height = height;
                        const relationData = findRelationById(
                            diagramRef.current,
                            cell.id,
                        );

                        if (isIdentifyingRelation(relationData)) {
                            syncIdentifyingRelationDecorator(cell);
                            syncIdentifyingRelationEdgeDecorator(
                                cell,
                                relationData,
                            );
                        }
                    }
                } finally {
                    this.getModel().endUpdate();
                }

                this.refresh(cell);
            };

            const getUnderlyingInteractiveCell = (cell) => {
                if (!cell?.id) return cell;

                const id = String(cell.id);

                if (id.endsWith(WEAK_ENTITY_DECORATOR_SUFFIX)) {
                    return accessCell(
                        id.slice(0, -WEAK_ENTITY_DECORATOR_SUFFIX.length),
                    );
                }

                if (id.endsWith(IDENTIFYING_RELATION_DECORATOR_SUFFIX)) {
                    return accessCell(
                        id.slice(
                            0,
                            -IDENTIFYING_RELATION_DECORATOR_SUFFIX.length,
                        ),
                    );
                }

                if (id.endsWith(IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX)) {
                    return accessCell(
                        id.slice(
                            0,
                            -IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX.length,
                        ),
                    );
                }

                if (id.endsWith(DISCRIMINANT_UNDERLINE_SUFFIX)) {
                    return accessCell(
                        id.slice(0, -DISCRIMINANT_UNDERLINE_SUFFIX.length),
                    );
                }

                return cell;
            };

            const originalGetCellForEvent = graph.getCellForEvent;

            graph.getCellForEvent = function (evt) {
                const cell = originalGetCellForEvent.call(this, evt);
                return getUnderlyingInteractiveCell(cell);
            };

            const originalGetInitialCellForEvent =
                graph.graphHandler.getInitialCellForEvent;

            graph.graphHandler.getInitialCellForEvent = function (me) {
                const cell = originalGetInitialCellForEvent.call(this, me);
                return getUnderlyingInteractiveCell(cell);
            };

            const originalDblClick = graph.dblClick;

            graph.dblClick = function (evt, cell) {
                const interactiveCell = getUnderlyingInteractiveCell(cell);
                originalDblClick.call(this, evt, interactiveCell);
            };

            recreateGraphFromLocalStorage();

            return () => {
                graph
                    .getSelectionModel()
                    .removeListener(mxEvent.CHANGE, onSelected);
                graph.cellLabelChanged = originalCellLabelChanged;
                graph.getCellForEvent = originalGetCellForEvent;
                graph.graphHandler.getInitialCellForEvent =
                    originalGetInitialCellForEvent;
                graph.dblClick = originalDblClick;
            };
        }
    }, [graph, onSelected]);

    const updateEntityAttributes = (entity) => {
        if (entity.attributes) {
            entity.attributes.forEach((attr) => {
                if (graph.model.cells.hasOwnProperty(attr.idMx)) {
                    const cellDataAttr = accessCell(attr.idMx);

                    let cellEdgeAttr = null;
                    const storedEdgeId = attr?.cell?.[1];

                    if (storedEdgeId) {
                        cellEdgeAttr = accessCell(storedEdgeId);
                    }

                    if (!cellEdgeAttr && cellDataAttr) {
                        const connectedEdges =
                            graph.getEdges(cellDataAttr) || [];
                        cellEdgeAttr = connectedEdges[0] ?? null;
                    }

                    if (!cellDataAttr || !cellEdgeAttr) {
                        return;
                    }

                    attr.name = cellDataAttr.value;
                    updateAttributePosition({
                        attribute: attr,
                        owner: entity,
                        position: cellDataAttr.geometry,
                    });
                    attr.cell = [cellDataAttr.id, cellEdgeAttr.id];
                }
            });
        }
    };

    const updateDiagramData = () => {
        diagramRef.current.entities.forEach((entity) => {
            if (graph.model.cells.hasOwnProperty(entity.idMx)) {
                const cellData = accessCell(entity.idMx);

                entity.name = cellData.value;
                entity.position.x = cellData.geometry.x;
                entity.position.y = cellData.geometry.y;

                updateEntityAttributes(entity);
            }
        });

        diagramRef.current.relations.forEach((relation) => {
            if (graph.model.cells.hasOwnProperty(relation.idMx)) {
                const cellData = accessCell(relation.idMx);

                relation.name = cellData.value;
                relation.position.x = cellData.geometry.x;
                relation.position.y = cellData.geometry.y;

                updateEntityAttributes(relation);
            }
        });
        saveToLocalStorage();
    };

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
        const attributeOwner = findAttributeOwnerById(
            diagramRef.current,
            selected.id,
        );

        if (!attributeOwner) return;

        const { owner, attribute } = attributeOwner;

        updateAttributePosition({
            attribute,
            owner,
            position: selected.geometry,
        });

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
        updateDiagramData();
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
        updateDiagramData();
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

            updateDiagramData();

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

        const newX = selected.geometry.x + offsetX;
        const newY = selected.geometry.y + offsetY;

        const uniqueAttributeName = generateUniqueAttributeName(
            selectedDiag.attributes,
        );

        const { width, height } = getAttributeDimensions(uniqueAttributeName);

        const target = graph.insertVertex(
            null,
            null,
            uniqueAttributeName, // Unique attribute name as placeholder
            newX,
            newY,
            width,
            height,
            getAttributeStyleString(semantics),
        );

        const edge = graph.insertEdge(selected, null, null, source, target);
        graph.orderCells(false); // Move front the selected entity so the new vertex aren't on top

        if (!isRelation && isWeakEntity(selectedDiag)) {
            syncWeakEntityDecorator(selected);
        }

        if (semantics.partialKey) {
            ensureDiscriminantUnderline(target);
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

        updateDiagramData();
        toast.success("Atributo insertado");
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

        const { entity } = selectedEntityAttribute;

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
        updateDiagramData();
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
        updateDiagramData();
        setRefreshDiagram((prevState) => !prevState);
    };

    const togglePartialKey = () => {
        if (!selected) return;
        if (!selected?.style?.includes("shape=ellipse")) return;

        const selectedEntityAttribute = getSelectedEntityAttributeData();
        if (!selectedEntityAttribute) return;

        const { entity } = selectedEntityAttribute;

        if (!isWeakEntity(entity)) {
            toast.error(
                "Solo las entidades débiles pueden tener atributo discriminante.",
            );
            return;
        }

        const result = toggleExclusivePartialKeyAttribute(
            entity.attributes,
            selected.id,
        );

        if (!result.updated) return;

        result.changedAttributes.forEach(syncAttributeVisualRepresentation);

        refreshGraph();
        updateDiagramData();
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
            getWeakAndStrongSidesForRelation(relation);

        if (!isIdentifyingRelation(relation)) {
            if (!relationHasBothEntitySides(relation)) {
                toast.error("Configura primero los dos lados de la relación.");
                return;
            }

            if (!weakEntity || !ownerEntity) {
                const conversionCandidate =
                    getCascadedWeakConversionCandidate(relation);

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
                applyIdentifyingRelationCardinalities(relation);

            if (!identifyingCardinalitiesApplied) {
                relation.isIdentifying = false;
                weakEntity.identifyingRelationId = null;
                weakEntity.ownerEntityId = null;

                toast.error(
                    "No se pudieron aplicar las cardinalidades de la relación de dependencia por identificación.",
                );
                return;
            }

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
        updateDiagramData();
        setRefreshDiagram((prevState) => !prevState);
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

                relation.side1 = {
                    cardinality: "X:X",
                    cell: "",
                    edgeId: "",
                    entity: { idMx: "" },
                    idMx: "",
                };
                relation.side2 = {
                    cardinality: "X:X",
                    cell: "",
                    edgeId: "",
                    entity: { idMx: "" },
                    idMx: "",
                };
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

            saveToLocalStorage();

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
            updateDiagramData();
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

        const { weakSide, strongSide } =
            getWeakAndStrongSidesForRelation(selectedDiag);

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
                            diagramRef.current.relations[index].side1 = {
                                idMx: "",
                                cardinality: "",
                                cell: "",
                                edgeId: "",
                                entity: { idMx: "" },
                            };
                            diagramRef.current.relations[index].side2 = {
                                idMx: "",
                                cardinality: "",
                                cell: "",
                                edgeId: "",
                                entity: { idMx: "" },
                            };
                            diagramRef.current.relations[
                                index
                            ].canHoldAttributes = false;
                        }
                    });
                }
            }
            updateDiagramData();
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

    const DeleteAttributeButton = () => {
        const isAttribute = selected?.style?.includes("shape=ellipse");

        if (!isAttribute) {
            return;
        }

        const selectedAttributeOwner = findAttributeOwnerById(
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
            const attributeOwner = findAttributeOwnerById(
                diagramRef.current,
                selected.id,
            );

            if (!attributeOwner) return;

            const { owner } = attributeOwner;

            const removedAttribute = removeAttributeFromOwnerById(
                owner,
                selected.id,
            );

            if (!removedAttribute) return;

            removeAttributesCells([removedAttribute]);

            updateDiagramData();
        }

        if (
            (isAttribute && !isKey && !isFromRelation) ||
            (isAttribute && isFromRelation)
        ) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={deleteAttribute}
                >
                    Borrar
                </button>
            );
        }
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
            updateDiagramData();
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

    const saveFileWithPicker = async ({
        content,
        fileName,
        mimeType,
        pickerTypes,
    }) => {
        if (!window.showSaveFilePicker) {
            toast.error(
                "Tu navegador no permite elegir dónde guardar el archivo.",
            );
            return;
        }

        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: pickerTypes,
            });

            const writable = await fileHandle.createWritable();
            await writable.write(new Blob([content], { type: mimeType }));
            await writable.close();

            toast.success("Archivo guardado correctamente.");
        } catch (error) {
            if (error?.name === "AbortError") {
                toast("Guardado cancelado.");
                return;
            }

            toast.error("No se pudo guardar el archivo.");
        }
    };

    const GenerateSQLButton = () => {
        const [open, setOpen] = React.useState(false);
        const [acceptDisabled, setAcceptDisabled] = React.useState(true);
        const [validationMessages, setValidationMessages] = React.useState([]);

        const handleClickOpen = () => {
            setRefreshDiagram((prevState) => !prevState);
            const diagnostics = validateGraph(diagramRef.current);

            if (diagnostics.isValid) {
                setAcceptDisabled(false);
                setValidationMessages([
                    "¿Deseas pasar a tablas el diagrama E-R?",
                ]);
            } else {
                setAcceptDisabled(true);
                const messages = [
                    "No se ha podido generar el script SQL por los siguientes errores:",
                ];
                if (!diagnostics.notEmpty)
                    messages.push("El diagrama está vacío.");
                if (!diagnostics.noRepeatedNames)
                    messages.push(
                        "Hay entidades o relaciones con nombres repetidos.",
                    );
                if (!diagnostics.noRepeatedAttrNames)
                    messages.push("Hay atributos repetidos en una entidad.");
                if (!diagnostics.noEntitiesWithoutAttributes)
                    messages.push("Hay entidades sin atributos.");
                if (!diagnostics.noEntitiesWithoutPK)
                    messages.push("Hay entidades sin clave primaria.");
                if (!diagnostics.noWeakEntitiesWithPrimaryKey)
                    messages.push(
                        "Hay entidades débiles con clave primaria normal.",
                    );
                if (!diagnostics.noWeakEntitiesWithoutPartialKey)
                    messages.push(
                        "Hay entidades débiles sin atributo discriminante.",
                    );
                if (!diagnostics.noWeakEntitiesWithMoreThanOnePartialKey)
                    messages.push(
                        "Hay entidades débiles con más de un atributo discriminante.",
                    );
                if (!diagnostics.noStrongEntitiesWithPartialKey)
                    messages.push(
                        "Hay entidades fuertes con atributo discriminante.",
                    );
                if (!diagnostics.noWeakEntitiesWithoutIdentifyingRelation)
                    messages.push(
                        "Hay entidades débiles sin relación de dependencia por identificación.",
                    );
                if (!diagnostics.noInvalidIdentifyingRelations)
                    messages.push(
                        "Hay relaciones de dependencia por identificación que no conectan una entidad débil dependiente con una entidad propietaria distinta.",
                    );
                if (!diagnostics.noInvalidIdentifyingCardinalities)
                    messages.push(
                        "Hay relaciones de dependencia por identificación con cardinalidades no válidas.",
                    );
                if (!diagnostics.noInconsistentWeakEntityOwnership)
                    messages.push(
                        "Hay entidades débiles cuya entidad propietaria es inconsistente.",
                    );
                if (!diagnostics.noMultipleIdentifyingRelationsPerWeakEntity)
                    messages.push(
                        "Hay entidades débiles con más de una relación de dependencia por identificación como entidad dependiente.",
                    );
                if (!diagnostics.noAttributesInNonNMRelations)
                    messages.push(
                        "Hay relaciones 1:1 o 1:N con atributos, lo cual no está soportado.",
                    );
                if (!diagnostics.noUnconnectedRelations)
                    messages.push("Hay relaciones desconectadas.");
                if (!diagnostics.noSQLIdentifierCollisions)
                    messages.push(
                        "Hay nombres que colisionan al normalizar identificadores SQL.",
                    );
                if (!diagnostics.noBrokenRelationEntityReferences)
                    messages.push(
                        "Hay relaciones que apuntan a entidades inexistentes.",
                    );
                if (!diagnostics.noNotValidCardinalities)
                    messages.push(
                        "Hay cardinalidades no válidas en las relaciones.",
                    );
                setValidationMessages(messages);
            }
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = async () => {
            setOpen(false);

            const sqlScript = generateSQL(diagramRef.current);

            await saveFileWithPicker({
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

            if (diagnostics.isValid) {
                setAcceptDisabled(false);
                setValidationMessages([
                    "¿Deseas exportar el diagrama en formato JSON?",
                ]);
            } else {
                setAcceptDisabled(true);
                const messages = [
                    "No se ha podido exportar el diagrama en formato JSON por los siguientes errores:",
                ];
                if (!diagnostics.notEmpty)
                    messages.push("El diagrama está vacío.");
                if (!diagnostics.noRepeatedNames)
                    messages.push("Hay entidades con nombres repetidos.");
                if (!diagnostics.noRepeatedAttrNames)
                    messages.push("Hay atributos repetidos en una entidad.");
                if (!diagnostics.noEntitiesWithoutAttributes)
                    messages.push("Hay entidades sin atributos.");
                if (!diagnostics.noEntitiesWithoutPK)
                    messages.push("Hay entidades sin clave primaria.");
                if (!diagnostics.noWeakEntitiesWithPrimaryKey)
                    messages.push(
                        "Hay entidades débiles con clave primaria normal.",
                    );
                if (!diagnostics.noWeakEntitiesWithoutPartialKey)
                    messages.push(
                        "Hay entidades débiles sin atributo discriminante.",
                    );
                if (!diagnostics.noWeakEntitiesWithMoreThanOnePartialKey)
                    messages.push(
                        "Hay entidades débiles con más de un atributo discriminante.",
                    );
                if (!diagnostics.noStrongEntitiesWithPartialKey)
                    messages.push(
                        "Hay entidades fuertes con atributo discriminante.",
                    );
                if (!diagnostics.noWeakEntitiesWithoutIdentifyingRelation)
                    messages.push(
                        "Hay entidades débiles sin relación de dependencia por identificación.",
                    );
                if (!diagnostics.noInvalidIdentifyingRelations)
                    messages.push(
                        "Hay relaciones de dependencia por identificación que no conectan una entidad débil dependiente con una entidad propietaria distinta.",
                    );
                if (!diagnostics.noInvalidIdentifyingCardinalities)
                    messages.push(
                        "Hay relaciones de dependencia por identificación con cardinalidades no válidas.",
                    );
                if (!diagnostics.noInconsistentWeakEntityOwnership)
                    messages.push(
                        "Hay entidades débiles cuya entidad propietaria es inconsistente.",
                    );
                if (!diagnostics.noMultipleIdentifyingRelationsPerWeakEntity)
                    messages.push(
                        "Hay entidades débiles con más de una relación de dependencia por identificación como entidad dependiente.",
                    );
                if (!diagnostics.noAttributesInNonNMRelations)
                    messages.push(
                        "Hay relaciones 1:1 o 1:N con atributos, lo cual no está soportado.",
                    );
                if (!diagnostics.noUnconnectedRelations)
                    messages.push("Hay relaciones desconectadas.");
                if (!diagnostics.noSQLIdentifierCollisions)
                    messages.push(
                        "Hay nombres que colisionan al normalizar identificadores SQL.",
                    );
                if (!diagnostics.noBrokenRelationEntityReferences)
                    messages.push(
                        "Hay relaciones que apuntan a entidades inexistentes.",
                    );
                if (!diagnostics.noNotValidCardinalities)
                    messages.push(
                        "Hay cardinalidades no válidas en las relaciones.",
                    );
                setValidationMessages(messages);
            }
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = async () => {
            setOpen(false);

            const jsonString = JSON.stringify(
                normalizeDiagramData(diagramRef.current),
                null,
                2,
            );

            await saveFileWithPicker({
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
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleFileChange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const rawImportedDiagram = JSON.parse(e.target.result);
                        const importedDiagram =
                            normalizeDiagramData(rawImportedDiagram);
                        const diagnostics = validateGraph(importedDiagram);
                        const messages = [
                            "No se ha podido importar el diagrama por los siguientes errores:",
                        ];
                        if (!diagnostics.notEmpty)
                            messages.push("El diagrama está vacío.");
                        if (!diagnostics.noRepeatedNames)
                            messages.push(
                                "Hay entidades con nombres repetidos.",
                            );
                        if (!diagnostics.noRepeatedAttrNames)
                            messages.push(
                                "Hay atributos repetidos en una entidad.",
                            );
                        if (!diagnostics.noEntitiesWithoutAttributes)
                            messages.push("Hay entidades sin atributos.");
                        if (!diagnostics.noEntitiesWithoutPK)
                            messages.push("Hay entidades sin clave primaria.");
                        if (!diagnostics.noEntitiesWithMoreThanOnePK)
                            messages.push(
                                "Hay entidades con más de una clave primaria.",
                            );
                        if (!diagnostics.noNMRelationsWithPK)
                            messages.push(
                                "Hay relaciones N-M con clave primaria.",
                            );
                        if (!diagnostics.noWeakEntitiesWithPrimaryKey)
                            messages.push(
                                "Hay entidades débiles con clave primaria normal.",
                            );
                        if (!diagnostics.noWeakEntitiesWithoutPartialKey)
                            messages.push(
                                "Hay entidades débiles sin atributo discriminante.",
                            );
                        if (
                            !diagnostics.noWeakEntitiesWithMoreThanOnePartialKey
                        )
                            messages.push(
                                "Hay entidades débiles con más de un atributo discriminante.",
                            );
                        if (!diagnostics.noStrongEntitiesWithPartialKey)
                            messages.push(
                                "Hay entidades fuertes con atributo discriminante.",
                            );
                        if (
                            !diagnostics.noWeakEntitiesWithoutIdentifyingRelation
                        )
                            messages.push(
                                "Hay entidades débiles sin relación de dependencia por identificación.",
                            );
                        if (!diagnostics.noInvalidIdentifyingRelations)
                            messages.push(
                                "Hay relaciones de dependencia por identificación que no conectan una entidad débil dependiente con una entidad propietaria distinta.",
                            );
                        if (!diagnostics.noInvalidIdentifyingCardinalities)
                            messages.push(
                                "Hay relaciones de dependencia por identificación con cardinalidades no válidas.",
                            );
                        if (!diagnostics.noInconsistentWeakEntityOwnership)
                            messages.push(
                                "Hay entidades débiles cuya entidad propietaria es inconsistente.",
                            );
                        if (
                            !diagnostics.noMultipleIdentifyingRelationsPerWeakEntity
                        )
                            messages.push(
                                "Hay entidades débiles con más de una relación de dependencia por identificación como entidad dependiente.",
                            );
                        if (!diagnostics.noAttributesInNonNMRelations)
                            messages.push(
                                "Hay relaciones 1:1 o 1:N con atributos, lo cual no está soportado.",
                            );
                        if (!diagnostics.noUnconnectedRelations)
                            messages.push("Hay relaciones desconectadas.");
                        if (!diagnostics.noSQLIdentifierCollisions)
                            messages.push(
                                "Hay nombres que colisionan al normalizar identificadores SQL.",
                            );
                        if (!diagnostics.noBrokenRelationEntityReferences)
                            messages.push(
                                "Hay relaciones que apuntan a entidades inexistentes.",
                            );
                        if (!diagnostics.noNotValidCardinalities)
                            messages.push(
                                "Hay cardinalidades no válidas en las relaciones.",
                            );
                        setValidationMessages(messages);

                        if (diagnostics.isValid) {
                            resetCanvas();
                            localStorage.setItem(
                                "diagramData",
                                JSON.stringify(importedDiagram),
                            );
                            recreateGraphFromLocalStorage();
                            setOpen(false);
                            toast.success("Diagrama importado con éxito.");
                        } else {
                            toast.error(
                                "El diagrama no se ha podido porque no es válido.",
                            );
                        }
                    } catch (error) {
                        toast.error("El diagrama no se ha podido importar.");
                    }
                };
                reader.readAsText(file);
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
        localStorage.removeItem("diagramData");

        // Filter out cells that aren't key 0 or 1
        const cellsToRemove = Object.keys(graph.model.cells)
            .filter((key) => key !== "0" && key !== "1")
            .map((key) => graph.model.cells[key]);

        // Remove the filtered cells
        graph.removeCells(cellsToRemove);
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
                <div>{ToggleAttributesButton()}</div>
                <div>{ToggleAttrKeyButton()}</div>
                <div>{TogglePartialKeyButton()}</div>
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
