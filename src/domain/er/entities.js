export const findEntityById = (diagram, entityId) =>
    diagram.entities.find((entity) => entity.idMx === entityId) ?? null;

export const getEntityAttributes = (entity) =>
    Array.isArray(entity?.attributes) ? entity.attributes : [];

export const isWeakEntity = (entity) => entity?.weak === true;
