import {
    getIdentifyingDependency,
    relationConnectsEntity,
    weakEntityOwnershipHasCycle,
} from "../helpers";

export function weakEntitiesWithoutPartialKey(graph) {
    for (const entity of graph.entities) {
        if (!entity.weak) continue;

        const hasPartialKey = entity.attributes?.some(
            (attribute) => attribute.partialKey,
        );

        if (!hasPartialKey) {
            return true;
        }
    }

    return false;
}

export function weakEntitiesWithMoreThanOnePartialKey(graph) {
    for (const entity of graph.entities) {
        if (!entity.weak) continue;

        const partialKeyCount = (entity.attributes ?? []).filter(
            (attribute) => attribute.partialKey === true,
        ).length;

        if (partialKeyCount > 1) {
            return true;
        }
    }

    return false;
}

export function weakEntitiesWithPrimaryKey(graph) {
    for (const entity of graph.entities) {
        if (!entity.weak) continue;

        const hasPrimaryKey = entity.attributes?.some(
            (attribute) => attribute.key === true,
        );

        if (hasPrimaryKey) {
            return true;
        }
    }

    return false;
}

export function strongEntitiesWithPartialKey(graph) {
    for (const entity of graph.entities) {
        if (entity.weak) continue;

        const hasPartialKey = entity.attributes?.some(
            (attribute) => attribute.partialKey === true,
        );

        if (hasPartialKey) {
            return true;
        }
    }

    return false;
}

export function weakEntitiesWithoutIdentifyingRelation(graph) {
    for (const entity of graph.entities) {
        if (!entity.weak) continue;

        if (!entity.identifyingRelationId) {
            return true;
        }

        const relation = graph.relations.find(
            (relation) => relation.idMx === entity.identifyingRelationId,
        );

        if (!relation || relation.isIdentifying !== true) {
            return true;
        }
    }

    return false;
}

export function identifyingRelationsNotValid(graph) {
    for (const relation of graph.relations) {
        if (!relation.isIdentifying) continue;

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
        if (!relation.isIdentifying) continue;

        const dependency = getIdentifyingDependency(graph, relation);

        // Invalid identifying endpoints are reported by identifyingRelationsNotValid.
        if (!dependency) continue;

        const weakCardinalityIsValid = ["0:N", "1:N"].includes(
            dependency.side.cardinality,
        );

        const ownerCardinalityIsValid =
            dependency.ownerSide.cardinality === "1:1";

        if (!weakCardinalityIsValid || !ownerCardinalityIsValid) {
            return true;
        }
    }

    return false;
}

export function inconsistentWeakEntityOwnership(graph) {
    for (const entity of graph.entities) {
        if (!entity.weak) continue;

        if (!entity.identifyingRelationId) {
            continue;
        }

        const relation = graph.relations.find(
            (rel) => rel.idMx === entity.identifyingRelationId,
        );

        if (!relation || relation.isIdentifying !== true) {
            return true;
        }

        if (!relationConnectsEntity(relation, entity.idMx)) {
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
        if (!relation.isIdentifying) continue;

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
