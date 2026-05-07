const getEntities = (diagram) =>
    Array.isArray(diagram?.entities) ? diagram.entities : [];

export const isWeakEntity = (entity) => entity?.weak === true;

export const findEntityById = (diagram, entityId) =>
    getEntities(diagram).find((entity) => entity.idMx === entityId) ?? null;

export const findEntityIndexById = (diagram, entityId) =>
    getEntities(diagram).findIndex((entity) => entity.idMx === entityId);

export const findWeakEntityByIdentifyingRelationId = (diagram, relationId) =>
    getEntities(diagram).find(
        (entity) =>
            isWeakEntity(entity) && entity.identifyingRelationId === relationId,
    ) ?? null;

export const findEntitiesByIdentifyingRelationId = (diagram, relationId) =>
    getEntities(diagram).filter(
        (entity) => entity.identifyingRelationId === relationId,
    );
