export const findRelationById = (diagram, relationId) =>
    diagram.relations.find((relation) => relation.idMx === relationId) ?? null;

export const getRelationSides = (relation) =>
    [relation?.side1, relation?.side2].filter(Boolean);

export const getRelationAttributes = (relation) =>
    Array.isArray(relation?.attributes) ? relation.attributes : [];

export const isIdentifyingRelation = (relation) =>
    relation?.isIdentifying === true;
