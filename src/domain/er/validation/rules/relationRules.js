import { hasPrimaryKeyAttributeInTree } from "../../attributes";
import { findEntityById } from "../../entities";
import {
    POSSIBLE_CARDINALITIES,
    getRelationSides,
    relationHasAllSideIds,
} from "../../relations";

// True if there is an N:M relation that has a key
export function nmRelationsWithPK(graph) {
    for (const relation of graph.relations) {
        // Check if the relation is of type N:M
        if (!relation.canHoldAttributes) {
            continue;
        }

        if (hasPrimaryKeyAttributeInTree(relation.attributes)) {
            return true;
        }
    }
    // If no N:M relation with a key is found, return false
    return false;
}

export function relationsUnconnected(graph) {
    for (const relation of graph.relations) {
        if (!relationHasAllSideIds(relation)) {
            return true; // Found an unconnected relation
        }
    }

    return false; // All relations are connected
}

export function brokenRelationEntityReferences(graph) {
    for (const relation of graph.relations) {
        const entityIds = getRelationSides(relation).map(
            (side) => side?.entity?.idMx ?? "",
        );

        // Las relaciones no configuradas ya las cubre relationsUnconnected
        if (entityIds.some((entityId) => !entityId)) {
            continue;
        }

        const hasBrokenReference = entityIds.some(
            (entityId) => findEntityById(graph, entityId) === null,
        );

        if (hasBrokenReference) {
            return true;
        }
    }

    return false;
}

export function notNMRelationsWithAttributes(graph) {
    for (const relation of graph.relations) {
        if (!relation.canHoldAttributes && relation.attributes.length > 0) {
            return true; // Found an relation that cant hold attributes that holds them
        }
    }

    return false;
}

export function cardinalitiesNotValid(graph) {
    for (const relation of graph.relations) {
        const hasInvalidCardinality = getRelationSides(relation).some(
            (side) => !POSSIBLE_CARDINALITIES.includes(side?.cardinality),
        );

        if (hasInvalidCardinality) {
            return true; // Found an invalid cardinality
        }
    }

    return false; // All cardinalities are valid
}
