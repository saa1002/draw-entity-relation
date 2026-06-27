import { hasPrimaryKeyAttributeInTree } from "../../attributes";
import { findEntityById } from "../../entities";
import {
    POSSIBLE_CARDINALITIES,
    canRelationHoldAttributes,
    canRelationTypeHoldAttributes,
    getRelationSideCardinality,
    getRelationSideRole,
    getRelationSides,
    isIdentifyingRelation,
    isRelationConfigured,
    isTernaryRelation,
} from "../../relations";

const relationHasAmbiguousRepeatedEntityParticipants = (relation) => {
    const sidesByEntityId = getRelationSides(relation).reduce(
        (result, side) => {
            const entityId = side?.entity?.idMx ?? "";

            if (!entityId) {
                return result;
            }

            result[entityId] = [...(result[entityId] ?? []), side];

            return result;
        },
        {},
    );

    return Object.values(sidesByEntityId).some((sides) => {
        if (sides.length <= 1) {
            return false;
        }

        const roles = sides.map(getRelationSideRole);

        return (
            roles.some((role) => !role) || new Set(roles).size !== roles.length
        );
    });
};

export function nmRelationsWithPK(graph) {
    for (const relation of graph.relations) {
        if (!canRelationHoldAttributes(relation)) {
            continue;
        }

        if (hasPrimaryKeyAttributeInTree(relation.attributes)) {
            return true;
        }
    }
    return false;
}

export function relationsUnconnected(graph) {
    for (const relation of graph.relations) {
        if (!isRelationConfigured(relation)) {
            return true;
        }
    }

    return false;
}

export function brokenRelationEntityReferences(graph) {
    for (const relation of graph.relations) {
        const entityIds = getRelationSides(relation).map(
            (side) => side?.entity?.idMx ?? "",
        );

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
        if (
            !canRelationTypeHoldAttributes(relation) &&
            relation.attributes.length > 0
        ) {
            return true;
        }
    }

    return false;
}

export function ternaryRelationsWithAmbiguousRepeatedParticipants(graph) {
    for (const relation of graph.relations) {
        if (!isTernaryRelation(relation)) {
            continue;
        }

        if (!isRelationConfigured(relation)) {
            continue;
        }

        if (relationHasAmbiguousRepeatedEntityParticipants(relation)) {
            return true;
        }
    }

    return false;
}

export function identifyingTernaryRelations(graph) {
    for (const relation of graph.relations) {
        if (isTernaryRelation(relation) && isIdentifyingRelation(relation)) {
            return true;
        }
    }

    return false;
}

export function ternaryRelationsWithMandatoryCardinalities(graph) {
    for (const relation of graph.relations) {
        if (!isTernaryRelation(relation)) {
            continue;
        }

        if (!isRelationConfigured(relation)) {
            continue;
        }

        const hasMandatoryMinimumCardinality = getRelationSides(relation).some(
            (side) => getRelationSideCardinality(side).minimum === "1",
        );

        if (hasMandatoryMinimumCardinality) {
            return true;
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
            return true;
        }
    }

    return false;
}
