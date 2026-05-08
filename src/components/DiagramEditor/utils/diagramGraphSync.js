const hasGraphCell = (graph, idMx) =>
    Object.prototype.hasOwnProperty.call(graph.model.cells, idMx);

const syncOwnerAttributesFromGraph = ({
    owner,
    graph,
    accessCell,
    updateAttributePosition,
}) => {
    if (!owner?.attributes) return;

    owner.attributes.forEach((attribute) => {
        if (!hasGraphCell(graph, attribute.idMx)) return;

        const attributeCell = accessCell(attribute.idMx);

        let edgeCell = null;
        const storedEdgeId = attribute?.cell?.[1];

        if (storedEdgeId) {
            edgeCell = accessCell(storedEdgeId);
        }

        if (!edgeCell && attributeCell) {
            const connectedEdges = graph.getEdges(attributeCell) || [];
            edgeCell = connectedEdges[0] ?? null;
        }

        if (!attributeCell || !edgeCell) return;

        attribute.name = attributeCell.value;

        updateAttributePosition({
            attribute,
            owner,
            position: attributeCell.geometry,
        });

        attribute.cell = [attributeCell.id, edgeCell.id];
    });
};

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
};
