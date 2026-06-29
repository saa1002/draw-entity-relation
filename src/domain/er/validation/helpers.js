import { findEntityById, isWeakEntity } from "../entities";
import { getWeakAndStrongSidesForRelation } from "../relations";

// Resolves the weak entity, owner entity and their relation sides for an
// identifying relation. Invalid or ambiguous identifying relations return null.
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

// Weak entities may depend on other weak entities. This check prevents ownership
// cycles that would make inherited primary-key resolution recursive forever.
export function weakEntityOwnershipHasCycle(graph, entity) {
    const visitedEntityIds = new Set([entity.idMx]);
    let currentEntity = entity;

    while (isWeakEntity(currentEntity) && currentEntity.ownerEntityId) {
        if (visitedEntityIds.has(currentEntity.ownerEntityId)) {
            return true;
        }

        visitedEntityIds.add(currentEntity.ownerEntityId);
        currentEntity = findEntityById(graph, currentEntity.ownerEntityId);
    }

    return false;
}
