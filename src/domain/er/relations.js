const getRelations = (diagram) =>
    Array.isArray(diagram?.relations) ? diagram.relations : [];

export const findRelationById = (diagram, relationId) =>
    getRelations(diagram).find((relation) => relation.idMx === relationId) ??
    null;

export const findRelationIndexById = (diagram, relationId) =>
    getRelations(diagram).findIndex((relation) => relation.idMx === relationId);

export const isIdentifyingRelation = (relation) =>
    relation?.isIdentifying === true;

export const canRelationHoldAttributes = (relation) =>
    relation?.canHoldAttributes === true;

export const relationHasBothEntitySides = (relation) =>
    !!relation?.side1?.entity?.idMx && !!relation?.side2?.entity?.idMx;

export const isRelationConfigured = (relation) =>
    relationHasBothEntitySides(relation) &&
    relation?.side1?.idMx !== "" &&
    relation?.side2?.idMx !== "";

export const isSelfRelation = (relation) =>
    relationHasBothEntitySides(relation) &&
    relation.side1.entity.idMx === relation.side2.entity.idMx;

export const relationInvolvesEntity = (relation, entityId) =>
    !!entityId &&
    (relation?.side1?.entity?.idMx === entityId ||
        relation?.side2?.entity?.idMx === entityId);

export const isManyToManyRelation = (relation) =>
    relation?.side1?.cardinality?.endsWith(":N") === true &&
    relation?.side2?.cardinality?.endsWith(":N") === true;
