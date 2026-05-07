const getAttributes = (attributes) =>
    Array.isArray(attributes) ? attributes : [];

const getEntities = (diagram) =>
    Array.isArray(diagram?.entities) ? diagram.entities : [];

const getRelations = (diagram) =>
    Array.isArray(diagram?.relations) ? diagram.relations : [];

export const findAttributeById = (attributes, attributeId) =>
    getAttributes(attributes).find(
        (attribute) => attribute.idMx === attributeId,
    ) ?? null;

export const findAttributeIndexById = (attributes, attributeId) =>
    getAttributes(attributes).findIndex(
        (attribute) => attribute.idMx === attributeId,
    );

export const findEntityByAttributeId = (diagram, attributeId) =>
    getEntities(diagram).find((entity) =>
        getAttributes(entity.attributes).some(
            (attribute) => attribute.idMx === attributeId,
        ),
    ) ?? null;

export const findRelationByAttributeId = (diagram, attributeId) =>
    getRelations(diagram).find((relation) =>
        getAttributes(relation.attributes).some(
            (attribute) => attribute.idMx === attributeId,
        ),
    ) ?? null;

export const findAttributeOwnerById = (diagram, attributeId) => {
    const entity = findEntityByAttributeId(diagram, attributeId);

    if (entity) {
        return {
            owner: entity,
            ownerType: "entity",
            attribute: findAttributeById(entity.attributes, attributeId),
        };
    }

    const relation = findRelationByAttributeId(diagram, attributeId);

    if (relation) {
        return {
            owner: relation,
            ownerType: "relation",
            attribute: findAttributeById(relation.attributes, attributeId),
        };
    }

    return null;
};

export const isPrimaryKeyAttribute = (attribute) => attribute?.key === true;

export const isPartialKeyAttribute = (attribute) =>
    attribute?.partialKey === true;
