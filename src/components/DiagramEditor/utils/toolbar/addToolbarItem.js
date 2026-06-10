import { default as MxGraph } from "mxgraph";
import { createAttribute } from "../../../../domain/er/attributes";
import { createIsaData } from "../../../../domain/er/isa";
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

    graph.orderCells(false);

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
    addEntityToDiagram,
    addRelationToDiagram,
    addIsaToDiagram = false,
    tooltip = "",
) {
    // Function that is executed when the image is dropped on
    // the graph. The cell argument points to the cell under
    // the mousepointer if there is one.
    const funct = (graph, evt, cell, x, y) => {
        graph.stopEditing(false);

        const vertex = graph.getModel().cloneCell(prototype);

        // Function to generate a unique name
        const generateUniqueName = (baseName, existingItems) => {
            let counter = 0;
            let uniqueName = baseName;

            const nameExists = (name) => {
                return existingItems.some((item) => item.name === name);
            };

            while (nameExists(uniqueName)) {
                counter++;
                uniqueName = `${baseName} ${counter}`;
            }

            return uniqueName;
        };

        // Retrieve existing entities and relations
        const existingEntities = diagramRef.current.entities || [];
        const existingRelations = diagramRef.current.relations || [];
        const existingIsas = diagramRef.current.isas || [];

        // Determine the base name and existing items array based on the flags
        let baseName;
        let existingItems;

        if (addEntityToDiagram) {
            baseName = "Entidad";
            existingItems = existingEntities;
        } else if (addRelationToDiagram) {
            baseName = "Relación";
            existingItems = existingRelations;
        } else if (addIsaToDiagram) {
            baseName = "ISA";
            existingItems = existingIsas;
        } else {
            baseName = "Test";
            existingItems = [];
        }

        // Generate a unique name
        const uniqueName = generateUniqueName(baseName, existingItems);

        // Set the vertex value to the unique name
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
        funct(graph, evt, cell, pt.x, pt.y);
    });

    if (tooltip) {
        img.setAttribute("title", tooltip);
        img.setAttribute("alt", tooltip);
        img.setAttribute("aria-label", tooltip);
    }

    // Disables dragging if element is disabled. This is a workaround
    // for wrong event order in IE. Following is a dummy listener that
    // is invoked as the last listener in IE.
    mxEvent.addListener(img, "mousedown", (evt) => {
        // do nothing
    });

    // This listener is always called first before any other listener
    // in all browsers.
    mxEvent.addListener(img, "mousedown", (evt) => {
        if (!img.enabled) {
            mxEvent.consume(evt);
        }
    });

    mxUtils.makeDraggable(img, graph, funct);

    return img;
}
