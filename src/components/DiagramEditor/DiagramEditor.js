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
import { generateSQL } from "../../utils/sql";
import { POSSIBLE_CARDINALITIES, validateGraph } from "../../utils/validation";
import { setInitialConfiguration } from "./utils";
import {
    ER_STROKE,
    ER_FILL,
    ER_FONT,
    ER_FONT_FAMILY,
    ER_FONT_SIZE,
    getAttributeDimensions,
    getEntityDimensions,
    getRelationDimensions,
    getEntityStyleString,
    getRelationStyleString,
    getCardinalityStyleString,
} from "./utils/diagramStyles";

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

    const identifyingRelationDecoratorStyle = {};
    identifyingRelationDecoratorStyle[mxConstants.STYLE_FILLCOLOR] = "none";
    identifyingRelationDecoratorStyle[mxConstants.STYLE_STROKECOLOR] = ER_STROKE;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_STROKEWIDTH] = 2;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_MOVABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_RESIZABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_EDITABLE] = 0;
    identifyingRelationDecoratorStyle[mxConstants.STYLE_ROTABLE] = 0;

    const partialKeyAttrStyle = {};
    partialKeyAttrStyle[mxConstants.STYLE_DASHED] = 1;
    partialKeyAttrStyle[mxConstants.STYLE_STROKEWIDTH] = 2;

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
    const addPrimaryAttrRef = React.useRef(null);

    const onSelected = React.useCallback(
        (evt) => {
            if (props.onSelected) {
                props.onSelected(evt);
            }
            setSelected(evt.cells[0]);
        },
        [props],
    );

    function accessCell(idMx) {
        return graph.model.cells[idMx];
    }
    const getSelectedEntityData = () =>
        diagramRef.current.entities.find(
            (entity) => entity.idMx === selected?.id,
    );
    
    const getSelectedEntityAttributeData = () => {
        for (const entity of diagramRef.current.entities) {
            const attribute = entity.attributes.find(
                (attr) => attr.idMx === selected?.id,
            );

            if (attribute) {
                return {
                    entity,
                    attribute,
                };
            }
        }

        return null;
    };

    const getSelectedRelationData = () =>
        diagramRef.current.relations.find(
            (relation) => relation.idMx === selected?.id,
    );

    const saveToLocalStorage = () => {
        const diagramData = JSON.stringify(diagramRef.current);
        localStorage.setItem("diagramData", diagramData);
    };

    const getAttributeStyleString = (attribute) => {
        const baseStyle = [
            "shape=ellipse",
            "perimeter=ellipsePerimeter",
            "align=center",
            "verticalAlign=middle",
            "spacing=0",
            "whiteSpace=wrap",
            "overflow=hidden",
            "resizable=0",
            `fillColor=${ER_FILL}`,
            `strokeColor=${ER_STROKE}`,
            "strokeWidth=1",
            `fontColor=${ER_FONT}`,
            `fontSize=${ER_FONT_SIZE}`,
            `fontFamily=${ER_FONT_FAMILY}`,
        ].join(";");

        if (attribute?.partialKey) {
            return `${baseStyle};partialKeyAttrStyle`;
        }

        if (attribute?.key) {
            return `${baseStyle};keyAttrStyle`;
        }

        return baseStyle;
    };

    const normalizeAttribute = (attribute) => ({
        ...attribute,
        key: attribute.key ?? false,
        partialKey: attribute.partialKey ?? false,
        cell: Array.isArray(attribute.cell)
            ? [attribute.cell[0] ?? attribute.idMx, attribute.cell[1] ?? null]
            : [attribute.idMx, null],
    });

    const normalizeEntity = (entity) => ({
        ...entity,
        weak: entity.weak ?? false,
        ownerEntityId: entity.ownerEntityId ?? null,
        identifyingRelationId: entity.identifyingRelationId ?? null,
        attributes: (entity.attributes || []).map(normalizeAttribute),
    });

    const normalizeRelationAttribute = (attribute) => ({
        ...attribute,
        partialKey: attribute.partialKey ?? false,
        cell: Array.isArray(attribute.cell)
            ? [attribute.cell[0] ?? attribute.idMx, attribute.cell[1] ?? null]
            : [attribute.idMx, null],
    });

    const normalizeRelation = (relation) => ({
        ...relation,
        isIdentifying: relation.isIdentifying ?? false,
        attributes: (relation.attributes || []).map(normalizeRelationAttribute),
    });

    const normalizeDiagramData = (diagramData) => ({
        entities: (diagramData?.entities || []).map(normalizeEntity),
        relations: (diagramData?.relations || []).map(normalizeRelation),
    });

    const WEAK_ENTITY_DECORATOR_SUFFIX = "__weak_decorator";
    const WEAK_ENTITY_DECORATOR_OFFSET = 5;
    const IDENTIFYING_RELATION_DECORATOR_SUFFIX = "__identifying_decorator";
    const IDENTIFYING_RELATION_DECORATOR_OFFSET = 5;
    const IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX = "__identifying_weak_edge_decorator";
    const IDENTIFYING_RELATION_EDGE_DECORATOR_OFFSET = 14;

    const isWeakEntityDecoratorCell = (cell) =>
        !!cell?.id && String(cell.id).endsWith(WEAK_ENTITY_DECORATOR_SUFFIX);

    const syncWeakEntityDecorator = (entityCell) => {
        if (!entityCell) return;

        const decorator = accessCell(getWeakEntityDecoratorId(entityCell.id));
        if (!decorator || !decorator.geometry || !entityCell.geometry) return;

        decorator.geometry.x =
            entityCell.geometry.x - WEAK_ENTITY_DECORATOR_OFFSET;
        decorator.geometry.y =
            entityCell.geometry.y - WEAK_ENTITY_DECORATOR_OFFSET;
        decorator.geometry.width =
            entityCell.geometry.width + WEAK_ENTITY_DECORATOR_OFFSET * 2;
        decorator.geometry.height =
            entityCell.geometry.height + WEAK_ENTITY_DECORATOR_OFFSET * 2;

        graph.refresh(decorator);
        graph.orderCells(true, [decorator]);
    };    

    const getWeakEntityDecoratorId = (entityId) =>
        `${entityId}${WEAK_ENTITY_DECORATOR_SUFFIX}`;

    const createWeakEntityDecorator = (entity) => {
        const { width, height } = getEntityDimensions(entity.name);
        return graph.insertVertex(
            null,
            getWeakEntityDecoratorId(entity.idMx),
            "",
            entity.position.x - WEAK_ENTITY_DECORATOR_OFFSET,
            entity.position.y - WEAK_ENTITY_DECORATOR_OFFSET,
            width + WEAK_ENTITY_DECORATOR_OFFSET * 2,
            height + WEAK_ENTITY_DECORATOR_OFFSET * 2,
            "weakEntityDecoratorStyle;shape=rectangle",
        );
    };
    const ensureWeakEntityDecorator = (entityCell, entityData) => {
        const existingDecorator = accessCell(getWeakEntityDecoratorId(entityCell.id));

        if (existingDecorator) {
            syncWeakEntityDecorator(entityCell);
            return;
        }

        createWeakEntityDecorator(entityData);
        syncWeakEntityDecorator(entityCell);
    };

    const removeWeakEntityDecorator = (entityId) => {
        const decorator = accessCell(getWeakEntityDecoratorId(entityId));
        if (decorator) {
            graph.removeCells([decorator]);
        }
    };

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
            relationCell.geometry.x - IDENTIFYING_RELATION_DECORATOR_OFFSET;
        decorator.geometry.y =
            relationCell.geometry.y - IDENTIFYING_RELATION_DECORATOR_OFFSET;
        decorator.geometry.width =
            relationCell.geometry.width +
            IDENTIFYING_RELATION_DECORATOR_OFFSET * 2;
        decorator.geometry.height =
            relationCell.geometry.height +
            IDENTIFYING_RELATION_DECORATOR_OFFSET * 2;

        graph.refresh(decorator);
        graph.orderCells(true, [decorator]);
    };

    const getIdentifyingRelationDecoratorId = (relationId) =>
        `${relationId}${IDENTIFYING_RELATION_DECORATOR_SUFFIX}`;

    const createIdentifyingRelationDecorator = (relation) => {
        const { width, height } = getRelationDimensions(relation.name);
        return graph.insertVertex(
            null,
            getIdentifyingRelationDecoratorId(relation.idMx),
            "",
            relation.position.x - IDENTIFYING_RELATION_DECORATOR_OFFSET,
            relation.position.y - IDENTIFYING_RELATION_DECORATOR_OFFSET,
            width + IDENTIFYING_RELATION_DECORATOR_OFFSET * 2,
            height + IDENTIFYING_RELATION_DECORATOR_OFFSET * 2,
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
        const decorator = accessCell(getIdentifyingRelationDecoratorId(relationId));
        if (decorator) {
            graph.removeCells([decorator]);
        }
    };

    const clearIdentifyingRelationSemantics = (relationId) => {
        if (!relationId) return;

        const relation = diagramRef.current.relations.find(
            (item) => item.idMx === relationId,
        );

        if (relation) {
            relation.isIdentifying = false;
            removeIdentifyingRelationDecorator(relation.idMx);
            removeIdentifyingRelationEdgeDecorator(relation.idMx);

            const relationCell = accessCell(relation.idMx);
            if (relationCell) {
                graph.getModel().setStyle(
                    relationCell,
                    getRelationStyleString(relation),
                );
            }
        }

        diagramRef.current.entities.forEach((entity) => {
            if (entity.identifyingRelationId === relationId) {
                entity.identifyingRelationId = null;
                entity.ownerEntityId = null;
            }
        });
    };
    const isIdentifyingRelationEdgeDecoratorCell = (cell) =>
        !!cell?.id &&
        String(cell.id).endsWith(IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX);
        
    const getIdentifyingRelationEdgeDecoratorId = (relationId) =>
        `${relationId}${IDENTIFYING_RELATION_EDGE_DECORATOR_SUFFIX}`;

    const getWeakEntityForIdentifyingRelation = (relation) =>
        diagramRef.current.entities.find(
            (entity) => entity.identifyingRelationId === relation?.idMx,
        ) ?? null;

    const getParallelEdgeControlPoint = (sourceCell, targetCell) => {
        if (!sourceCell?.geometry || !targetCell?.geometry) return null;

        const x1 = sourceCell.geometry.x + sourceCell.geometry.width / 2;
        const y1 = sourceCell.geometry.y + sourceCell.geometry.height / 2;
        const x2 = targetCell.geometry.x + targetCell.geometry.width / 2;
        const y2 = targetCell.geometry.y + targetCell.geometry.height / 2;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy) || 1;

        const normalX = -dy / length;
        const normalY = dx / length;

        return new mxPoint(
            midX + normalX * IDENTIFYING_RELATION_EDGE_DECORATOR_OFFSET,
            midY + normalY * IDENTIFYING_RELATION_EDGE_DECORATOR_OFFSET,
        );
    };

    const createIdentifyingRelationEdgeDecorator = (relationCell, relationData) => {
        const weakEntity = getWeakEntityForIdentifyingRelation(relationData);
        const weakEntityCell = accessCell(weakEntity?.idMx);

        if (!relationCell || !weakEntityCell) return null;

        const edge = graph.insertEdge(
            null,
            getIdentifyingRelationEdgeDecoratorId(relationData.idMx),
            null,
            relationCell,
            weakEntityCell,
            [
                `strokeColor=${ER_STROKE}`,
                "strokeWidth=2",
                "endArrow=none",
                "dashed=0",
                "editable=0",
                "movable=0",
                "resizable=0",
                "rounded=0",
            ].join(";"),
        );

        if (!edge.geometry) {
            edge.geometry = new mxGeometry();
        }

        edge.geometry.relative = true;
        edge.geometry.points = [getParallelEdgeControlPoint(relationCell, weakEntityCell)];

        graph.orderCells(true, [edge]);
        return edge;
    };

    const syncIdentifyingRelationEdgeDecorator = (relationCell, relationData) => {
        const edge = accessCell(
            getIdentifyingRelationEdgeDecoratorId(relationData.idMx),
        );
        const weakEntity = getWeakEntityForIdentifyingRelation(relationData);
        const weakEntityCell = accessCell(weakEntity?.idMx);

        if (!edge || !relationCell || !weakEntityCell) return;

        graph.getModel().beginUpdate();
        try {
            graph.getModel().setTerminal(edge, relationCell, true);
            graph.getModel().setTerminal(edge, weakEntityCell, false);

            if (!edge.geometry) {
                edge.geometry = new mxGeometry();
            }

            edge.geometry.relative = true;
            edge.geometry.points = [
                getParallelEdgeControlPoint(relationCell, weakEntityCell),
            ];
        } finally {
            graph.getModel().endUpdate();
        }

        graph.refresh(edge);
        graph.orderCells(true, [edge]);
    };

    const ensureIdentifyingRelationEdgeDecorator = (relationCell, relationData) => {
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
        const edge = accessCell(getIdentifyingRelationEdgeDecoratorId(relationId));
        if (edge) {
            graph.removeCells([edge]);
        }
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

            edge = graph.insertEdge(
                source,
                storedEdgeId,
                null,
                source,
                target,
            );

            attribute.cell = [target.id, edge.id];

            graph.orderCells(true, [edge]); // Move front the selected entity so the new vertex aren't on top
        };
        const recreateEntity = (entity) => {
            if (entity.weak) {
                const decorator = createWeakEntityDecorator(entity);
                graph.orderCells(true, [decorator]); // Move front the selected entity so the new vertex aren't on top
            }

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
            for (const attribute of entity.attributes) {
                recreateAttribute(attribute, source);
            }
        };

        const recreateRelation = (relation) => {

            const { width, height } = getRelationDimensions(relation.name);

            if (relation.isIdentifying) {
                const decorator = createIdentifyingRelationDecorator(relation);
                graph.orderCells(true, [decorator]);
            }

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

            if (relation.isIdentifying) {
                syncIdentifyingRelationDecorator(source);
                ensureIdentifyingRelationEdgeDecorator(source, relation);
            }

            for (const attribute of relation.attributes) {
                recreateAttribute(attribute, source);
            }

            if (relation.side1.idMx !== "" && relation.side2.idMx !== "") {
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
                    isIdentifyingRelationEdgeDecoratorCell(cell) 
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

            graph.stylesheet.styles.defaultEdge.endArrow = ""; // NOTE: Edges are not directed

            graph.getStylesheet().putCellStyle("keyAttrStyle", keyAttrStyle);
            graph
                .getStylesheet()
                .putCellStyle("partialKeyAttrStyle", partialKeyAttrStyle);
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
                originalCellLabelChanged.apply(this, arguments);

                if (!cell?.style) return;

                this.getModel().beginUpdate();
                try {
                    if (cell.style.includes("shape=ellipse")) {
                        const { width, height } = getAttributeDimensions(newValue);
                        cell.geometry.width = width;
                        cell.geometry.height = height;
                    } else if (
                        cell.style.includes("shape=rectangle") &&
                        !isWeakEntityDecoratorCell(cell)
                    ) {
                        const { width, height } = getEntityDimensions(newValue);
                        cell.geometry.width = width;
                        cell.geometry.height = height;

                        const entityData = diagramRef.current.entities.find(
                            (entity) => entity.idMx === cell.id,
                        );

                        if (entityData?.weak) {
                            syncWeakEntityDecorator(cell);
                        }
                        if (entityData?.identifyingRelationId) {
                            const relationData = diagramRef.current.relations.find(
                                (relation) => relation.idMx === entityData.identifyingRelationId,
                            );
                            const relationCell = accessCell(relationData?.idMx);

                            if (relationData && relationCell) {
                                syncIdentifyingRelationEdgeDecorator(relationCell, relationData);
                            }
                        }
                    } else if (
                        cell.style.includes("shape=rhombus") &&
                        !isIdentifyingRelationDecoratorCell(cell)
                    ) {
                        const { width, height } = getRelationDimensions(newValue);
                        cell.geometry.width = width;
                        cell.geometry.height = height;
                        const relationData = diagramRef.current.relations.find(
                                (relation) => relation.idMx === cell.id,
                        );

                        if (relationData?.isIdentifying) {
                            syncIdentifyingRelationDecorator(cell);
                            syncIdentifyingRelationEdgeDecorator(cell, relationData);
                        }
                    }
                } finally {
                    this.getModel().endUpdate();
                }

                this.refresh(cell);
            };
            recreateGraphFromLocalStorage();
            
            return () => {
                graph
                .getSelectionModel()
                .removeListener(mxEvent.CHANGE, onSelected);
                graph.cellLabelChanged = originalCellLabelChanged;   
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
                    const connectedEdges = graph.getEdges(cellDataAttr) || [];
                    cellEdgeAttr = connectedEdges[0] ?? null;
                }

                if (!cellDataAttr || !cellEdgeAttr) {
                    return;
                }

                    attr.name = cellDataAttr.value;
                    attr.position.x = cellDataAttr.geometry.x;
                    attr.position.y = cellDataAttr.geometry.y;
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
        const selectedEntityDiag = diagramRef.current.entities.find(
            (entity) => entity.idMx === selected.id,
        );

        selectedEntityDiag?.attributes.forEach((attribute) => {
            accessCell(attribute.cell.at(0)).geometry.x =
                selected.geometry.x + attribute.offsetX;
            accessCell(attribute.cell.at(0)).geometry.y =
                selected.geometry.y + attribute.offsetY;
        });

        if(selectedEntityDiag?.weak) {
            syncWeakEntityDecorator(selected);
        }

        if (selectedEntityDiag?.identifyingRelationId) {
            const relationData = diagramRef.current.relations.find(
                (relation) => relation.idMx === selectedEntityDiag.identifyingRelationId,
            );
            const relationCell = accessCell(relationData?.idMx);

            if (relationData && relationCell) {
                syncIdentifyingRelationEdgeDecorator(relationCell, relationData);
            }
        }

        refreshGraph();
    };

    const handleRelationMove = (selected) => {
        const selectedRelationDiag = diagramRef.current.relations.find(
            (relation) => relation.idMx === selected.id,
        );
        if (selectedRelationDiag.canHoldAttributes) {
            selectedRelationDiag?.attributes.forEach((attribute) => {
                accessCell(attribute.cell.at(0)).geometry.x =
                    selected.geometry.x + attribute.offsetX;
                accessCell(attribute.cell.at(0)).geometry.y =
                    selected.geometry.y + attribute.offsetY;
            });
            refreshGraph();
        }
        if (
            selectedRelationDiag.side1.entity.idMx !== "" &&
            selectedRelationDiag.side2.entity.idMx !== "" &&
            selectedRelationDiag.side1.entity.idMx ===
                selectedRelationDiag.side2.entity.idMx
        ) {
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
        if (selectedRelationDiag?.isIdentifying) {
            syncIdentifyingRelationDecorator(selected);
            syncIdentifyingRelationEdgeDecorator(selected, selectedRelationDiag);
        }
    };

    const handleAttributeMove = (selected) => {
        let parentEntity = diagramRef.current.entities.find((entity) =>
            entity.attributes.some((attr) => attr.idMx === selected.id),
        );
        // If no parent entity found, check if it's an N:M relation
        if (!parentEntity) {
            parentEntity = diagramRef.current.relations.find((relation) =>
                relation.attributes.some((attr) => attr.idMx === selected.id),
            );
        }

        if (parentEntity) {
            const attribute = parentEntity.attributes.find(
                (attr) => attr.idMx === selected.id,
            );

            if (attribute) {
                // Update offset
                attribute.offsetX =
                    selected.geometry.x - parentEntity.position.x;
                attribute.offsetY =
                    selected.geometry.y - parentEntity.position.y;
            }
        }
    };

    const onCellsMoved = (_evt) => {
        if (selected) {
            if (selected?.style?.includes("shape=rectangle") && 
            !isWeakEntityDecoratorCell(selected)) {
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
            const handleCellsMoved = (evt) => {
                onCellsMoved(evt);
            };
            // Add the listener
            graph.addListener(mxEvent.CELLS_MOVED, handleCellsMoved);

            updateDiagramData();

            // Cleanup function to remove the listener
            return () => {
                graph.removeListener(handleCellsMoved, mxEvent.CELLS_MOVED);
            };
        }
    }, [graph, selected, diagramRef, refreshDiagram]);

    const pushCellsBack = (moveBack) => () => {
        graph.orderCells(moveBack);
    };

    const addAttribute = () => {
        let selectedDiag;
        let isRelation = false;
        if (selected?.style?.includes("shape=rectangle") &&
            !isWeakEntityDecoratorCell(selected)) {
            selectedDiag = diagramRef.current.entities.find(
                (entity) => entity.idMx === selected.id,
            );
        } else if (selected?.style?.includes("shape=rhombus")) {
            selectedDiag = diagramRef.current.relations.find(
                (relation) => relation.idMx === selected.id,
            );
            isRelation = true;
        }
        const addKey = selectedDiag?.attributes?.length === 0;
        addPrimaryAttrRef.current = addKey;
        const source = selected;

        // Initial offset
        let offsetX = 120;
        let offsetY = -40;

        if (selectedDiag?.attributes?.length) {
            const lastAttribute =
                selectedDiag.attributes[selectedDiag.attributes.length - 1];
            const lastAttrCell = graph.getModel().getCell(lastAttribute.idMx);
            offsetX = lastAttrCell.geometry.x - source.geometry.x;
            offsetY = lastAttrCell.geometry.y - source.geometry.y + 20;
        }

        const newX = selected.geometry.x + offsetX;
        const newY = selected.geometry.y + offsetY;

        // Function to generate a unique attribute name
        const generateUniqueAttributeName = (baseName, existingAttributes) => {
            let counter = 0;
            let uniqueName = baseName;

            const nameExists = (name) => {
                return existingAttributes.some((attr) => attr.name === name);
            };

            while (nameExists(uniqueName)) {
                counter++;
                uniqueName = `${baseName} ${counter}`;
            }

            return uniqueName;
        };

        const baseAttributeName = "Atributo";
        const existingAttributes = selectedDiag.attributes || [];
        const uniqueAttributeName = generateUniqueAttributeName(
            baseAttributeName,
            existingAttributes,
        );
        const newAttributeData = {
            key: addPrimaryAttrRef.current && !isRelation,
            partialKey: false,
        };

        const { width, height } = getAttributeDimensions(uniqueAttributeName);

        const target = graph.insertVertex(
            null,
            null,
            uniqueAttributeName, // Unique attribute name as placeholder
            newX,
            newY,
            width,
            height,
            getAttributeStyleString(newAttributeData),
        );

        const edge = graph.insertEdge(selected, null, null, source, target);
        graph.orderCells(false); // Move front the selected entity so the new vertex aren't on top

        if (!isRelation) {
            // Update diagram state
            diagramRef.current.entities
                .find((entity) => entity.idMx === selected.id)
                .attributes.push({
                    idMx: target.id,
                    name: target.value,
                    position: {
                        x: target.geometry.x,
                        y: target.geometry.y,
                    },
                    key: addPrimaryAttrRef.current,
                    partialKey: false,
                    cell: [target.id, edge.id],                    
                    offsetX: target.geometry.x - selected.geometry.x,
                    offsetY: target.geometry.y - selected.geometry.y,
                });
        } else if (isRelation) {
            // Update diagram state
            diagramRef.current.relations
                .find((relation) => relation.idMx === selected.id)
                .attributes.push({
                    idMx: target.id,
                    name: target.value,
                    position: {
                        x: target.geometry.x,
                        y: target.geometry.y,
                    },
                    partialKey: false,
                    cell: [target.id, edge.id],
                    offsetX: target.geometry.x - selected.geometry.x,
                    offsetY: target.geometry.y - selected.geometry.y,
                });
        }
        updateDiagramData();
        toast.success("Atributo insertado");
    };

    const hideAttributes = (isRelationNM) => {
        const selectedEntity = !isRelationNM
            ? diagramRef.current.entities.find(
                  ({ idMx }) => idMx === selected.id,
              )
            : diagramRef.current.relations.find(
                  ({ idMx }) => idMx === selected.id,
              );
        selectedEntity.attributes.forEach(({ cell }) => {
            accessCell(cell.at(0)).setVisible(false);
            accessCell(cell.at(1)).setVisible(false);
        });

        const updatedAttributesHidden = { ...entityWithAttributesHidden };
        updatedAttributesHidden[selected.id] = true;
        setEntityWithAttributesHidden(updatedAttributesHidden);

        refreshGraph();
    };

    const showAttributes = (isRelationNM) => {
        const selectedEntity = !isRelationNM
            ? diagramRef.current.entities.find(
                  ({ idMx }) => idMx === selected.id,
              )
            : diagramRef.current.relations.find(
                  ({ idMx }) => idMx === selected.id,
              );
        selectedEntity.attributes.forEach(({ cell }) => {
            accessCell(cell.at(0)).setVisible(true);
            accessCell(cell.at(1)).setVisible(true);
        });

        const updatedAttributesHidden = { ...entityWithAttributesHidden };
        updatedAttributesHidden[selected.id] = false;
        setEntityWithAttributesHidden(updatedAttributesHidden);

        refreshGraph();
    };

    const toggleAttrKey = () => {
        let entityIndexToUpdate;
        const cellsToDelete = [];
        const cellsToRecreate = [];

        diagramRef.current.entities.find((entity, index) => {
            entity.attributes.forEach((attribute) => {
                if (attribute.idMx === selected.id) {
                    entityIndexToUpdate = index;
                    return true;
                }
            });
        });

        diagramRef.current.entities
            .at(entityIndexToUpdate)
            .attributes.forEach((attribute) => {
                cellsToDelete.push(accessCell(attribute.cell.at(0)));
                cellsToDelete.push(accessCell(attribute.cell.at(1)));
                if (attribute.idMx === selected.id) {
                    attribute.key = true;
                    attribute.partialKey = false;
                } else {
                    attribute.key = false;
                }
                graph.getModel().setStyle(
                    accessCell(attribute.cell.at(0)),
                    getAttributeStyleString(attribute),
                );
                cellsToRecreate.push(accessCell(attribute.cell.at(0)));
                cellsToRecreate.push(accessCell(attribute.cell.at(1)));
            });

        graph.removeCells(cellsToDelete);
        graph.addCells(cellsToRecreate);
        graph.orderCells(true, cellsToRecreate);

        // This triggers a rerender
        setRefreshDiagram((prevState) => !prevState);
    };

    const toggleWeakEntity = () => {
        if (!selected) return;
        if (!selected?.style?.includes("shape=rectangle")) return;
        if (isWeakEntityDecoratorCell(selected)) return;

        const entity = getSelectedEntityData();
        if (!entity) return;

        entity.weak = !entity.weak;

        if (entity.weak) {
            ensureWeakEntityDecorator(selected, entity);
            toast.success("Entidad marcada como débil");
        } else {
            clearIdentifyingRelationSemantics(entity.identifyingRelationId);
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

        const { attribute } = selectedEntityAttribute;

        attribute.partialKey = !attribute.partialKey;

        if (attribute.partialKey) {
            attribute.key = false;
            toast.success("Atributo marcado como clave parcial");
        } else {
            toast.success("Clave parcial eliminada");
        }

        const attributeCell = accessCell(attribute.idMx);
        if (attributeCell) {
            graph.getModel().setStyle(
                attributeCell,
                getAttributeStyleString(attribute),
            );
        }

        refreshGraph();
        updateDiagramData();
        setRefreshDiagram((prevState) => !prevState);
    };

    const toggleIdentifyingRelation = () => {
        if (!selected) return;
        if (isIdentifyingRelationDecoratorCell(selected)) return;
        if (!selected?.style?.includes("shape=rhombus")) return;

        const relation = getSelectedRelationData();
        if (!relation) return;

        const side1Entity = diagramRef.current.entities.find(
            (entity) => entity.idMx === relation.side1.entity.idMx,
        );
        const side2Entity = diagramRef.current.entities.find(
            (entity) => entity.idMx === relation.side2.entity.idMx,
        );

        if (!relation.isIdentifying) {
            if (!side1Entity || !side2Entity) {
                toast.error(
                    "Configura primero los dos lados de la relación.",
                );
                return;
            }

            const weakEntities = [side1Entity, side2Entity].filter(
                (entity) => entity?.weak,
            );

            if (weakEntities.length !== 1) {
                toast.error(
                    "Una relación identificadora debe conectar exactamente una entidad débil y una fuerte.",
                );
                return;
            }

            const weakEntity = weakEntities[0];
            const ownerEntity =
                weakEntity.idMx === side1Entity.idMx ? side2Entity : side1Entity;

            if (!ownerEntity || ownerEntity.weak) {
                toast.error(
                    "La entidad propietaria de una relación identificadora debe ser fuerte.",
                );
                return;
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

            ensureIdentifyingRelationDecorator(selected, relation);
            ensureIdentifyingRelationEdgeDecorator(selected, relation);

            toast.success("Relación marcada como identificadora");
        } else {
            clearIdentifyingRelationSemantics(relation.idMx);
            toast.success("Relación identificadora eliminada");
        }

        const relationCell = accessCell(relation.idMx);
        if (relationCell) {
            graph.getModel().setStyle(
                relationCell,
                getRelationStyleString(relation),
            );
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
        if (selected?.style?.includes("shape=rectangle") && 
            !isWeakEntityDecoratorCell(selected)) {
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
            selected?.style?.includes("shape=rhombus") &&
            diagramRef.current.relations.find(
                (entity) => entity.idMx === selected?.id,
            )?.canHoldAttributes
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
        const isEntity = selected?.style?.includes("shape=rectangle") &&
            !isWeakEntityDecoratorCell(selected);
        const isRelationNM =
            selected?.style?.includes("shape=rhombus") &&
            diagramRef.current.relations.find(
                (entity) => entity.idMx === selected?.id,
            )?.canHoldAttributes;

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
        let isKey;
        let isFromRelation = false;

        for (const entity of diagramRef.current.entities) {
            for (const attribute of entity.attributes) {
                if (attribute.idMx === selected?.id) {
                    isKey = attribute.key;
                    break; // Exit the inner loop once the matching attribute is found
                }
            }

            if (isKey !== undefined) {
                break; // Exit the outer loop once the matching attribute is found
            }
        }

        for (const relation of diagramRef.current.relations) {
            for (const attribute of relation.attributes) {
                if (attribute.idMx === selected?.id) {
                    isFromRelation = true;
                    break;
                }
            }
        }

        if (isAttribute && !isKey && !isFromRelation) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={toggleAttrKey}
                >
                    Convertir en clave
                </button>
            );
        }
    };

    const TogglePartialKeyButton = () => {
        const isAttribute = selected?.style?.includes("shape=ellipse");
        const selectedEntityAttribute = getSelectedEntityAttributeData();

        if (!isAttribute || !selectedEntityAttribute) {
            return;
        }

        const { attribute } = selectedEntityAttribute;

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
                    ? "Quitar clave parcial"
                    : "Convertir en clave parcial"}
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
                    {selectedEntityDiag.weak
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
                    {selectedRelationDiag.isIdentifying
                        ? "Quitar relación identificadora"
                        : "Marcar como identificadora"}
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
            const relation = diagramRef.current.relations.find(
                (relation) => relation.idMx === source.id,
            );

            if (relation.isIdentifying) {
                clearIdentifyingRelationSemantics(relation.idMx);
            }

            if (relation.side1.idMx !== "" && relation.side2.idMx !== "") {
                // Find the previous edges
                const cardinality1 = accessCell(relation.side1.idMx);
                const cardinality2 = accessCell(relation.side2.idMx);
                const edge1 = accessCell(relation.side1.edgeId);
                const edge2 = accessCell(relation.side2.edgeId);
                let attributesToDelete = [];

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
                if (relation.canHoldAttributes) {
                    for (const attribute of relation.attributes) {
                        attributesToDelete.push(
                            accessCell(attribute.cell.at(0)),
                        );
                        attributesToDelete.push(
                            accessCell(attribute.cell.at(1)),
                        );
                    }
                    graph.removeCells(attributesToDelete);

                    relation.canHoldAttributes = false;
                    relation.attributes = [];
                }

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

            const selectedDiag = diagramRef.current.relations.find(
                (entity) => entity.idMx === selected?.id,
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
        const selectedDiag = diagramRef.current.relations.find(
            (entity) => entity.idMx === selected?.id,
        );
        const [open, setOpen] = React.useState(false);
        const [acceptDisabled, setAcceptDisabled] = React.useState(true);

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = () => {
            selectedDiag.side1.cardinality = side1;
            selectedDiag.side2.cardinality = side2;

            if (side1.endsWith(":N") && side2.endsWith(":N")) {
                selectedDiag.canHoldAttributes = true;
            } else {
                let attributesToDelete = [];

                for (const attribute of selectedDiag.attributes) {
                    attributesToDelete.push(accessCell(attribute.cell.at(0)));
                    attributesToDelete.push(accessCell(attribute.cell.at(1)));
                }
                graph.removeCells(attributesToDelete);

                selectedDiag.canHoldAttributes = false;
                selectedDiag.attributes = [];
            }

            const label1 = accessCell(selectedDiag.side1.cell);
            const label2 = accessCell(selectedDiag.side2.cell);

            graph.model.setValue(label1, side1);
            graph.model.setValue(label2, side2);

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
            }
        }, [side1, side2]);

        if (isRelation) {
            const isConfigured =
                selectedDiag?.side1.idMx !== "" &&
                selectedDiag?.side2.idMx !== "";
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
                                            {`${
                                                accessCell(
                                                    selectedDiag?.side1?.entity
                                                        ?.idMx,
                                                )?.value
                                            } - ${
                                                accessCell(
                                                    selectedDiag?.side2?.entity
                                                        ?.idMx,
                                                )?.value
                                            }`}
                                        </InputLabel>
                                        <Select
                                            id="side1-to-side2"
                                            value={side1}
                                            label="Cardinalidad 1"
                                            onChange={handleChangeSide1}
                                        >
                                            {POSSIBLE_CARDINALITIES.filter(
                                                (cardinality) =>
                                                    cardinality !== "1:1" ||
                                                    side2 !== "1:1",
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
                                            {`${
                                                accessCell(
                                                    selectedDiag?.side2?.entity
                                                        ?.idMx,
                                                )?.value
                                            } - ${
                                                accessCell(
                                                    selectedDiag?.side1?.entity
                                                        ?.idMx,
                                                )?.value
                                            }`}
                                        </InputLabel>
                                        <Select
                                            id="side2-to-side1"
                                            value={side2}
                                            label="Cardinalidad 2"
                                            onChange={handleChangeSide2}
                                        >
                                            {POSSIBLE_CARDINALITIES.filter(
                                                (cardinality) =>
                                                    cardinality !== "1:1" ||
                                                    side1 !== "1:1",
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
        const isEntity = selected?.style?.includes("shape=rectangle") && 
            !isWeakEntityDecoratorCell(selected);
        function deleteEntity() {
            // Find the entity in diagramRef.current.entities
            const entityIndex = diagramRef.current.entities.findIndex(
                (entity) => entity.idMx === selected.id,
            );

            if (entityIndex !== -1) {
                const entity = diagramRef.current.entities[entityIndex];

                // Remove the entity from diagramRef.current.entities
                diagramRef.current.entities.splice(entityIndex, 1);

                // Find the corresponding cell in graph.model.cells
                const cell = accessCell(entity.idMx);
                const weakDecorator = entity.weak
                    ? accessCell(getWeakEntityDecoratorId(entity.idMx))
                    : null;
                if (cell) {
                    // Collect the attribute cells to delete
                    const attributeCells = entity.attributes.flatMap((attr) => {
                        return accessCell(attr.cell.at(0));
                    });

                    // Remove the entity's cell and its attributes from the graph
                    graph.removeCells(
                        weakDecorator
                            ? [weakDecorator, cell, ...attributeCells]
                            : [cell, ...attributeCells],
                    );
                    // Check and remove relations involving this entity
                    diagramRef.current.relations.forEach((relation, index) => {
                        if (
                            relation.side1.entity.idMx === entity.idMx ||
                            relation.side2.entity.idMx === entity.idMx
                        ) {
                            
                            clearIdentifyingRelationSemantics(relation.idMx);

                            // Find the corresponding cells in graph.model.cells for the relation
                            const side1Cell = accessCell(relation.side1.cell);
                            const side2Cell = accessCell(relation.side2.cell);
                            const edge1Cell = accessCell(relation.side1.edgeId);
                            const edge2Cell = accessCell(relation.side2.edgeId);

                            // Collect the relation's attribute cells to delete
                            const relationAttributeCells =
                                relation.attributes.flatMap((attr) =>
                                    accessCell(attr.cell.at(0)),
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
        let isKey;
        let isFromRelation = false;

        for (const entity of diagramRef.current.entities) {
            for (const attribute of entity.attributes) {
                if (attribute.idMx === selected?.id) {
                    isKey = attribute.key;
                    break; // Exit the inner loop once the matching attribute is found
                }
            }

            if (isKey !== undefined) {
                break; // Exit the outer loop once the matching attribute is found
            }
        }

        for (const relation of diagramRef.current.relations) {
            for (const attribute of relation.attributes) {
                if (attribute.idMx === selected?.id) {
                    isFromRelation = true;
                    break;
                }
            }
        }

        function deleteAttribute(isRelation) {
            if (!isRelation) {
                // Find the entity that contains the attribute
                const entity = diagramRef.current.entities.find((entity) =>
                    entity.attributes.some((attr) => attr.idMx === selected.id),
                );

                if (entity) {
                    // Find the attribute index
                    const attrIndex = entity.attributes.findIndex(
                        (attr) => attr.idMx === selected.id,
                    );

                    if (attrIndex !== -1) {
                        const attribute = entity.attributes[attrIndex];

                        // Remove the attribute from the entity
                        entity.attributes.splice(attrIndex, 1);

                        // Find the corresponding cells in graph.model.cells
                        const cells = attribute.cell.map(
                            (cellId) => graph.model.cells[cellId],
                        );

                        if (cells.length) {
                            // Remove the cells from the graph
                            graph.removeCells(cells);
                        }
                    }
                }
            } else {
                // Find the relation that contains the attribute
                const relation = diagramRef.current.relations.find((relation) =>
                    relation.attributes.some(
                        (attr) => attr.idMx === selected.id,
                    ),
                );

                if (relation) {
                    // Find the attribute index
                    const attrIndex = relation.attributes.findIndex(
                        (attr) => attr.idMx === selected.id,
                    );

                    if (attrIndex !== -1) {
                        const attribute = relation.attributes[attrIndex];

                        // Remove the attribute from the relation
                        relation.attributes.splice(attrIndex, 1);

                        // Find the corresponding cells in graph.model.cells
                        const cells = attribute.cell.map(
                            (cellId) => graph.model.cells[cellId],
                        );

                        if (cells.length) {
                            // Remove the cells from the graph
                            graph.removeCells(cells);
                        }
                    }
                }
            }
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
                    onClick={() => deleteAttribute(isFromRelation)}
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
            const relationIndex = diagramRef.current.relations.findIndex(
                (relation) => relation.idMx === selected.id,
            );

            if (relationIndex !== -1) {
                const relation = diagramRef.current.relations[relationIndex];

                clearIdentifyingRelationSemantics(relation.idMx);

                // Remove the relation from diagramRef.current.relations
                diagramRef.current.relations.splice(relationIndex, 1);

                const cell = accessCell(relation.idMx);

                if (cell) {
                    // Remove the attributes associated with the entity
                    const attributeCells = relation.attributes.flatMap(
                        (attr) => {
                            // NOTE: Seems that we only need to delete the label and ellipse
                            // because the edge is deleted when deleting the parent object
                            return accessCell(attr.cell.at(0));
                        },
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
                if (!diagnostics.noUnconnectedRelations)
                    messages.push("Hay relaciones desconectadas.");
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

        const handleAccept = () => {
            setOpen(false);
            const sqlScript = generateSQL(diagramRef.current);

            // Create a blob with the SQL script
            const blob = new Blob([sqlScript], { type: "text/plain" });

            // Create a link element
            const link = document.createElement("a");

            // Set the download attribute with a filename
            link.download = "tables.sql";

            // Create a URL for the blob and set it as the href attribute
            link.href = window.URL.createObjectURL(blob);

            // Append the link to the body
            document.body.appendChild(link);

            // Programmatically click the link to trigger the download
            link.click();

            // Remove the link from the document
            document.body.removeChild(link);
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
                if (!diagnostics.noUnconnectedRelations)
                    messages.push("Hay relaciones desconectadas.");
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

        const handleAccept = () => {
            setOpen(false);
            const jsonString = JSON.stringify(diagramRef.current);

            // Create a blob with the JSON string
            const blob = new Blob([jsonString], { type: "application/json" });

            // Create a link element
            const link = document.createElement("a");

            // Set the download attribute with a filename
            link.download = "diagram.json";

            // Create a URL for the blob and set it as the href attribute
            link.href = window.URL.createObjectURL(blob);

            // Append the link to the body
            document.body.appendChild(link);

            // Programmatically click the link to trigger the download
            link.click();

            // Remove the link from the document
            document.body.removeChild(link);
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
                        const importedDiagram = JSON.parse(e.target.result);
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
                        if (!diagnostics.noUnconnectedRelations)
                            messages.push("Hay relaciones desconectadas.");
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
