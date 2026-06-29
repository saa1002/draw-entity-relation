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

// Relation validation rules for binary, ternary, identifying and repeated
// participant relations.

// Repeated participants in a ternary relation are only supported when each
// repeated side has a non-empty and distinct role.
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

// Relation attributes are regular descriptive columns in the generated relation
// table; they are not allowed to define primary keys themselves.
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

// Unconfigured sides are handled by the unconnected-relation rule. This rule only
// reports references to entities that should exist but no longer do.
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

// In this implementation, own relation attributes are kept only for relation
// types that generate an independent relation table.
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

// Ternary relations with repeated participants require non-empty and distinct
// roles so each participation can be distinguished later.
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

// Ternary minimum cardinalities are not represented in the simplified SQL output,
// so mandatory ternary participation is rejected by validation.
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
