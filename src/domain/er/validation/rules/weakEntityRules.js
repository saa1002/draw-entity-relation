import {
    getPartialKeyAttributesInTree,
    hasPartialKeyAttributeInTree,
    hasPrimaryKeyAttributeInTree,
} from "../../attributes";
import { isWeakEntity } from "../../entities";
import {
    IDENTIFYING_RELATION_STRONG_SIDE_CARDINALITY,
    IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITIES,
    findRelationById,
    isIdentifyingRelation,
    relationInvolvesEntity,
} from "../../relations";
import {
    getIdentifyingDependency,
    weakEntityOwnershipHasCycle,
} from "../helpers";

export function weakEntitiesWithoutPartialKey(graph) {
    for (const entity of graph.entities) {
        if (!isWeakEntity(entity)) continue;

        if (!hasPartialKeyAttributeInTree(entity.attributes)) {
            return true;
        }
    }

    return false;
}

export function weakEntitiesWithMoreThanOnePartialKey(graph) {
    for (const entity of graph.entities) {
        if (!isWeakEntity(entity)) continue;

        if (getPartialKeyAttributesInTree(entity.attributes).length > 1) {
            return true;
        }
    }

    return false;
}

export function weakEntitiesWithPrimaryKey(graph) {
    for (const entity of graph.entities) {
        if (!isWeakEntity(entity)) continue;

        if (hasPrimaryKeyAttributeInTree(entity.attributes)) {
            return true;
        }
    }

    return false;
}

export function strongEntitiesWithPartialKey(graph) {
    for (const entity of graph.entities) {
        if (isWeakEntity(entity)) continue;

        if (hasPartialKeyAttributeInTree(entity.attributes)) {
            return true;
        }
    }

    return false;
}

export function weakEntitiesWithoutIdentifyingRelation(graph) {
    for (const entity of graph.entities) {
        if (!isWeakEntity(entity)) continue;

        if (!entity.identifyingRelationId) {
            return true;
        }

        const relation = findRelationById(graph, entity.identifyingRelationId);

        if (!isIdentifyingRelation(relation)) {
            return true;
        }
    }

    return false;
}

export function identifyingRelationsNotValid(graph) {
    for (const relation of graph.relations) {
        if (!isIdentifyingRelation(relation)) continue;

        // An identifying relationship must have exactly one dependent weak
        // entity and one different owner entity. The owner may be either
        // strong or weak, which allows weak-entity cascades.
        if (!getIdentifyingDependency(graph, relation)) {
            return true;
        }
    }

    return false;
}

export function identifyingRelationCardinalitiesNotValid(graph) {
    for (const relation of graph.relations) {
        if (!isIdentifyingRelation(relation)) continue;

        const dependency = getIdentifyingDependency(graph, relation);

        // Invalid identifying endpoints are reported by identifyingRelationsNotValid.
        if (!dependency) continue;

        const weakCardinalityIsValid =
            IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITIES.includes(
                dependency.side.cardinality,
            );

        const ownerCardinalityIsValid =
            dependency.ownerSide.cardinality ===
            IDENTIFYING_RELATION_STRONG_SIDE_CARDINALITY;

        if (!weakCardinalityIsValid || !ownerCardinalityIsValid) {
            return true;
        }
    }

    return false;
}

export function inconsistentWeakEntityOwnership(graph) {
    for (const entity of graph.entities) {
        if (!isWeakEntity(entity)) continue;

        if (!entity.identifyingRelationId) {
            continue;
        }

        const relation = findRelationById(graph, entity.identifyingRelationId);

        if (!isIdentifyingRelation(relation)) {
            return true;
        }

        if (!relationInvolvesEntity(relation, entity.idMx)) {
            return true;
        }

        const dependency = getIdentifyingDependency(graph, relation);

        if (!dependency) {
            return true;
        }

        if (dependency.entity.idMx !== entity.idMx) {
            return true;
        }

        if (
            !dependency.ownerEntity ||
            dependency.ownerEntity.idMx === entity.idMx
        ) {
            return true;
        }

        if (entity.ownerEntityId !== dependency.ownerEntity.idMx) {
            return true;
        }

        if (weakEntityOwnershipHasCycle(graph, entity)) {
            return true;
        }
    }

    return false;
}

export function multipleIdentifyingRelationsPerWeakEntity(graph) {
    const dependencyCountByWeakEntityId = new Map();

    for (const relation of graph.relations) {
        if (!isIdentifyingRelation(relation)) continue;

        const dependency = getIdentifyingDependency(graph, relation);
        if (!dependency) continue;

        const weakEntityId = dependency.entity.idMx;
        const dependencyCount =
            (dependencyCountByWeakEntityId.get(weakEntityId) ?? 0) + 1;

        if (dependencyCount > 1) {
            return true;
        }

        dependencyCountByWeakEntityId.set(weakEntityId, dependencyCount);
    }

    return false;
}
