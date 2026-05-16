const normalizePosition = (position) => ({
    x: typeof position?.x === "number" ? position.x : 0,
    y: typeof position?.y === "number" ? position.y : 0,
});

const normalizeAttributeCell = (cell, fallbackId = "") => {
    if (Array.isArray(cell)) {
        return [cell[0] ?? fallbackId, cell[1] ?? null];
    }

    return [fallbackId, null];
};

const normalizeAttributeBase = (normalizeChild, attribute = {}) => ({
    ...attribute,
    idMx: attribute.idMx ?? "",
    name: attribute.name ?? "",
    position: normalizePosition(attribute.position),
    key: attribute.key ?? false,
    partialKey: attribute.partialKey ?? false,
    cell: normalizeAttributeCell(attribute.cell, attribute.idMx),
    offsetX: typeof attribute.offsetX === "number" ? attribute.offsetX : 0,
    offsetY: typeof attribute.offsetY === "number" ? attribute.offsetY : 0,
    ...normalizeAttributeChildren(attribute, normalizeChild),
});

export const normalizeAttribute = (attribute = {}) =>
    normalizeAttributeBase(normalizeAttribute, attribute);

export const normalizeRelationAttribute = (attribute = {}) =>
    normalizeAttributeBase(normalizeRelationAttribute, attribute);

export const normalizeEntity = (entity = {}) => ({
    ...entity,
    idMx: entity.idMx ?? "",
    name: entity.name ?? "",
    position: normalizePosition(entity.position),
    weak: entity.weak ?? false,
    ownerEntityId: entity.ownerEntityId ?? null,
    identifyingRelationId: entity.identifyingRelationId ?? null,
    attributes: Array.isArray(entity.attributes)
        ? entity.attributes.map(normalizeAttribute)
        : [],
});

export const normalizeRelationSide = (side = {}) => ({
    ...side,
    idMx: side.idMx ?? "",
    cardinality: side.cardinality ?? "",
    cell: side.cell ?? side.idMx ?? "",
    edgeId: side.edgeId ?? "",
    entity: {
        ...(side.entity ?? {}),
        idMx: side.entity?.idMx ?? "",
    },
});

export const normalizeRelation = (relation = {}) => ({
    ...relation,
    idMx: relation.idMx ?? "",
    name: relation.name ?? "",
    position: normalizePosition(relation.position),
    isIdentifying: relation.isIdentifying ?? false,
    canHoldAttributes: relation.canHoldAttributes ?? false,
    side1: normalizeRelationSide(relation.side1),
    side2: normalizeRelationSide(relation.side2),
    attributes: Array.isArray(relation.attributes)
        ? relation.attributes.map(normalizeRelationAttribute)
        : [],
});

export const normalizeDiagramData = (diagramData = {}) => ({
    entities: Array.isArray(diagramData.entities)
        ? diagramData.entities.map(normalizeEntity)
        : [],
    relations: Array.isArray(diagramData.relations)
        ? diagramData.relations.map(normalizeRelation)
        : [],
});

const normalizeAttributeChildren = (attribute, normalizeChild) => {
    if (!Object.prototype.hasOwnProperty.call(attribute, "children")) {
        return {};
    }

    return {
        children: Array.isArray(attribute.children)
            ? attribute.children.map(normalizeChild)
            : [],
    };
};
