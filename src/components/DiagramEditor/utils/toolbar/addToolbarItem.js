import { default as MxGraph } from "mxgraph";
import { createAttribute } from "../../../../domain/er/attributes";
import { ISA_CELL_LABEL, createIsaData } from "../../../../domain/er/isa";
import { createRelationData } from "../../../../domain/er/relations";
import {
    getAttributeDimensions,
    getEntityDimensions,
    getIsaDimensions,
    getRelationDimensions,
} from "../mxStyles/diagramStyles";
import { getAttributeStyleString } from "../rendering/attributeRendering";

const { mxEvent, mxUtils } = MxGraph();

const DEFAULT_PRIMARY_KEY_ATTRIBUTE_NAME = "id";
const DEFAULT_PRIMARY_KEY_ATTRIBUTE_OFFSET_X = 120;
const DEFAULT_PRIMARY_KEY_ATTRIBUTE_OFFSET_Y = -40;

const generateUniqueName = (baseName, existingItems = []) => {
    let counter = 0;
    let uniqueName = baseName;

    while (existingItems.some((item) => item.name === uniqueName)) {
        counter++;
        uniqueName = `${baseName} ${counter}`;
    }

    return uniqueName;
};

const createDefaultPrimaryKeyAttributeForEntity = (graph, entityCell) => {
    if (!graph || !entityCell?.geometry) {
        return null;
    }

    const semantics = {
        key: true,
        partialKey: false,
    };
    const attributeX =
        entityCell.geometry.x + DEFAULT_PRIMARY_KEY_ATTRIBUTE_OFFSET_X;
    const attributeY =
        entityCell.geometry.y + DEFAULT_PRIMARY_KEY_ATTRIBUTE_OFFSET_Y;
    const { width, height } = getAttributeDimensions(
        DEFAULT_PRIMARY_KEY_ATTRIBUTE_NAME,
    );

    const target = graph.insertVertex(
        null,
        null,
        DEFAULT_PRIMARY_KEY_ATTRIBUTE_NAME,
        attributeX,
        attributeY,
        width,
        height,
        getAttributeStyleString({
            name: DEFAULT_PRIMARY_KEY_ATTRIBUTE_NAME,
            ...semantics,
        }),
    );

    const edge = graph.insertEdge(entityCell, null, null, entityCell, target);

    graph.orderCells(true, [edge]);
    graph.orderCells(false, [entityCell, target]);
    graph.refresh(edge);

    return createAttribute({
        idMx: target.id,
        name: DEFAULT_PRIMARY_KEY_ATTRIBUTE_NAME,
        position: {
            x: target.geometry.x,
            y: target.geometry.y,
        },
        key: semantics.key,
        partialKey: semantics.partialKey,
        cell: [target.id, edge.id],
        offsetX: DEFAULT_PRIMARY_KEY_ATTRIBUTE_OFFSET_X,
        offsetY: DEFAULT_PRIMARY_KEY_ATTRIBUTE_OFFSET_Y,
    });
};

export default function addToolbarItem(
    graph,
    toolbar,
    prototype,
    image,
    diagramRef,
    addEntityToDiagram = false,
    addRelationToDiagram = false,
    addIsaToDiagram = false,
    tooltip = "",
) {
    const insertToolbarVertex = (graph, _evt, _cell, x, y) => {
        graph.stopEditing(false);

        const vertex = graph.getModel().cloneCell(prototype);

        const existingEntities = diagramRef.current.entities || [];
        const existingRelations = diagramRef.current.relations || [];
        const existingIsas = diagramRef.current.isas || [];

        let baseName = String(vertex.value ?? "").trim() || "Elemento";
        let existingItems = [];

        if (addEntityToDiagram) {
            baseName = "Entidad";
            existingItems = existingEntities;
        } else if (addRelationToDiagram) {
            baseName = "Relación";
            existingItems = existingRelations;
        } else if (addIsaToDiagram) {
            baseName = ISA_CELL_LABEL;
            existingItems = existingIsas;
        }

        const uniqueName = generateUniqueName(baseName, existingItems);

        vertex.value = uniqueName;

        if (addEntityToDiagram) {
            const { width, height } = getEntityDimensions(uniqueName);
            vertex.geometry.width = width;
            vertex.geometry.height = height;
        } else if (addRelationToDiagram) {
            const { width, height } = getRelationDimensions(uniqueName);
            vertex.geometry.width = width;
            vertex.geometry.height = height;
        } else if (addIsaToDiagram) {
            const { width, height } = getIsaDimensions();
            vertex.geometry.width = width;
            vertex.geometry.height = height;
        }

        vertex.geometry.x = x;
        vertex.geometry.y = y;

        graph.addCell(vertex);

        if (addEntityToDiagram) {
            const entityData = {
                idMx: vertex.id,
                name: vertex.value,
                position: { x: vertex.geometry.x, y: vertex.geometry.y },
                weak: false,
                ownerEntityId: null,
                identifyingRelationId: null,
                attributes: [],
            };
            const primaryKeyAttribute =
                createDefaultPrimaryKeyAttributeForEntity(graph, vertex);

            if (primaryKeyAttribute) {
                entityData.attributes.push(primaryKeyAttribute);
            }

            diagramRef.current.entities.push(entityData);
        }
        if (addRelationToDiagram) {
            diagramRef.current.relations.push(
                createRelationData({
                    idMx: vertex.id,
                    name: vertex.value,
                    position: {
                        x: vertex.geometry.x,
                        y: vertex.geometry.y,
                    },
                }),
            );
        }
        if (addIsaToDiagram) {
            diagramRef.current.isas = diagramRef.current.isas ?? [];

            diagramRef.current.isas.push(
                createIsaData({
                    idMx: vertex.id,
                    position: {
                        x: vertex.geometry.x,
                        y: vertex.geometry.y,
                    },
                }),
            );
        }

        graph.setSelectionCell(vertex);
    };

    // Creates the image which is used as the drag icon (preview)
    const img = toolbar.addMode(null, image, function (evt, cell) {
        const pt = this.graph.getPointForEvent(evt);
        insertToolbarVertex(graph, evt, cell, pt.x, pt.y);
    });

    if (tooltip) {
        img.setAttribute("title", tooltip);
        img.setAttribute("alt", tooltip);
        img.setAttribute("aria-label", tooltip);
    }

    mxEvent.addListener(img, "mousedown", () => undefined);

    mxEvent.addListener(img, "mousedown", (evt) => {
        if (!img.enabled) {
            mxEvent.consume(evt);
        }
    });

    mxUtils.makeDraggable(img, graph, insertToolbarVertex);

    return img;
}
