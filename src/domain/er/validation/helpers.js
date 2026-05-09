export function getEntityById(graph, entityId) {
    return graph.entities.find((entity) => entity.idMx === entityId) ?? null;
}

export function relationConnectsEntity(relation, entityId) {
    return (
        relation?.side1?.entity?.idMx === entityId ||
        relation?.side2?.entity?.idMx === entityId
    );
}

export function getIdentifyingDependency(graph, relation) {
    const side1EntityId = relation?.side1?.entity?.idMx;
    const side2EntityId = relation?.side2?.entity?.idMx;

    if (!side1EntityId || !side2EntityId) {
        return null;
    }

    if (side1EntityId === side2EntityId) {
        return null;
    }

    const side1Entity = getEntityById(graph, side1EntityId);
    const side2Entity = getEntityById(graph, side2EntityId);

    if (!side1Entity || !side2Entity) {
        return null;
    }

    const makeDependency = (entity, side, ownerEntity, ownerSide) => ({
        entity,
        side,
        ownerEntity,
        ownerSide,
    });

    const side1IsWeak = side1Entity.weak === true;
    const side2IsWeak = side2Entity.weak === true;

    if (side1IsWeak && !side2IsWeak) {
        return makeDependency(
            side1Entity,
            relation.side1,
            side2Entity,
            relation.side2,
        );
    }

    if (!side1IsWeak && side2IsWeak) {
        return makeDependency(
            side2Entity,
            relation.side2,
            side1Entity,
            relation.side1,
        );
    }

    if (!side1IsWeak && !side2IsWeak) {
        return null;
    }

    const side1AlreadyHasOwner =
        !!side1Entity.identifyingRelationId && !!side1Entity.ownerEntityId;

    const side2AlreadyHasOwner =
        !!side2Entity.identifyingRelationId && !!side2Entity.ownerEntityId;

    const side1CanBecomeDependent =
        !side1Entity.identifyingRelationId ||
        side1Entity.identifyingRelationId === relation.idMx;

    const side2CanBecomeDependent =
        !side2Entity.identifyingRelationId ||
        side2Entity.identifyingRelationId === relation.idMx;

    if (side1AlreadyHasOwner && side2CanBecomeDependent) {
        return makeDependency(
            side2Entity,
            relation.side2,
            side1Entity,
            relation.side1,
        );
    }

    if (side2AlreadyHasOwner && side1CanBecomeDependent) {
        return makeDependency(
            side1Entity,
            relation.side1,
            side2Entity,
            relation.side2,
        );
    }

    const side1Maximum = relation.side1?.cardinality?.split(":")?.[1];
    const side2Maximum = relation.side2?.cardinality?.split(":")?.[1];

    if (side1Maximum === "N" && side2Maximum === "1") {
        return makeDependency(
            side1Entity,
            relation.side1,
            side2Entity,
            relation.side2,
        );
    }

    if (side2Maximum === "N" && side1Maximum === "1") {
        return makeDependency(
            side2Entity,
            relation.side2,
            side1Entity,
            relation.side1,
        );
    }

    return null;
}

export function weakEntityOwnershipHasCycle(graph, entity) {
    const visitedEntityIds = new Set([entity.idMx]);
    let currentEntity = entity;

    while (currentEntity?.weak === true && currentEntity.ownerEntityId) {
        if (visitedEntityIds.has(currentEntity.ownerEntityId)) {
            return true;
        }

        visitedEntityIds.add(currentEntity.ownerEntityId);
        currentEntity = getEntityById(graph, currentEntity.ownerEntityId);
    }

    return false;
}
