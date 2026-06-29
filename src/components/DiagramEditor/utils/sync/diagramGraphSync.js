import {
    getAttributeChildren,
    isCompositeAttribute,
} from "../../../../domain/er";

// Synchronizes model data from the live mxGraph canvas. This is the main bridge
// for names, positions and cell identifiers after user interactions.
const hasGraphCell = (graph, idMx) =>
    Object.prototype.hasOwnProperty.call(graph.model.cells, idMx);

// Attribute edges may be missing from stored data after imports or older
// diagrams, so they are recovered from mxGraph connections when possible.
const findConnectedAttributeEdge = (graph, attributeCell) => {
    const connectedEdges = graph.getEdges(attributeCell) || [];

    return (
        connectedEdges.find((edge) => edge?.target?.id === attributeCell.id) ??
        connectedEdges[0] ??
        null
    );
};

// Updates one attribute from its visual cell and connection edge. The function
// then recurses through child attributes to keep composite trees synchronized.
const syncAttributeFromGraph = ({
    attribute,
    owner,
    graph,
    accessCell,
    updateAttributePosition,
}) => {
    if (!hasGraphCell(graph, attribute.idMx)) return;

    const attributeCell = accessCell(attribute.idMx);

    let edgeCell = null;
    const storedEdgeId = attribute?.cell?.[1];

    if (storedEdgeId) {
        edgeCell = accessCell(storedEdgeId);
    }

    if (!edgeCell && attributeCell) {
        edgeCell = findConnectedAttributeEdge(graph, attributeCell);
    }

    if (!attributeCell || !edgeCell) return;

    // Composite attribute connector cells render with an empty value, so they should
    // not overwrite the model name unless mxGraph provides an explicit value.
    const shouldSyncAttributeName =
        !isCompositeAttribute(attribute) ||
        (attributeCell.value !== "" &&
            attributeCell.value !== null &&
            attributeCell.value !== undefined);

    if (shouldSyncAttributeName) {
        attribute.name = attributeCell.value;
    }

    updateAttributePosition({
        attribute,
        owner,
        position: attributeCell.geometry,
    });

    attribute.cell = [attributeCell.id, edgeCell.id];

    getAttributeChildren(attribute).forEach((childAttribute) => {
        syncAttributeFromGraph({
            attribute: childAttribute,
            owner: attribute,
            graph,
            accessCell,
            updateAttributePosition,
        });
    });
};

const syncOwnerAttributesFromGraph = ({
    owner,
    graph,
    accessCell,
    updateAttributePosition,
}) => {
    if (!owner?.attributes) return;

    owner.attributes.forEach((attribute) => {
        syncAttributeFromGraph({
            attribute,
            owner,
            graph,
            accessCell,
            updateAttributePosition,
        });
    });
};

// Entities and relations share the same synchronization pattern: their label and
// position come from the main vertex, then their attribute trees are synchronized.
const syncOwnerNodeFromGraph = ({
    owner,
    graph,
    accessCell,
    updateAttributePosition,
}) => {
    if (!hasGraphCell(graph, owner.idMx)) return;

    const cellData = accessCell(owner.idMx);

    owner.name = cellData.value;
    owner.position.x = cellData.geometry.x;
    owner.position.y = cellData.geometry.y;

    syncOwnerAttributesFromGraph({
        owner,
        graph,
        accessCell,
        updateAttributePosition,
    });
};

// Public synchronization entry point used before persistence, export or other
// operations that need the internal model to reflect the current canvas state.
export const syncDiagramDataFromGraph = ({
    diagram,
    graph,
    accessCell,
    updateAttributePosition,
}) => {
    if (!diagram || !graph?.model?.cells) return;

    diagram.entities.forEach((entity) => {
        syncOwnerNodeFromGraph({
            owner: entity,
            graph,
            accessCell,
            updateAttributePosition,
        });
    });

    diagram.relations.forEach((relation) => {
        syncOwnerNodeFromGraph({
            owner: relation,
            graph,
            accessCell,
            updateAttributePosition,
        });
    });

    (diagram.isas ?? []).forEach((isa) => {
        if (!hasGraphCell(graph, isa.idMx)) return;

        const isaCell = accessCell(isa.idMx);

        isa.position.x = isaCell.geometry.x;
        isa.position.y = isaCell.geometry.y;
    });
};
