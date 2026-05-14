import { findEntityById } from "../entities";
import { getWeakAndStrongSidesForRelation } from "../relations";

export function getIdentifyingDependency(graph, relation) {
    const { weakEntity, strongEntity, weakSide, strongSide } =
        getWeakAndStrongSidesForRelation(graph, relation);

    if (!weakEntity || !strongEntity || !weakSide || !strongSide) {
        return null;
    }

    return {
        entity: weakEntity,
        side: weakSide,
        ownerEntity: strongEntity,
        ownerSide: strongSide,
    };
}

export function weakEntityOwnershipHasCycle(graph, entity) {
    const visitedEntityIds = new Set([entity.idMx]);
    let currentEntity = entity;

    while (currentEntity?.weak === true && currentEntity.ownerEntityId) {
        if (visitedEntityIds.has(currentEntity.ownerEntityId)) {
            return true;
        }

        visitedEntityIds.add(currentEntity.ownerEntityId);
        currentEntity = findEntityById(graph, currentEntity.ownerEntityId);
    }

    return false;
}
