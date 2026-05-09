import { getEntityById } from "../helpers";

export const POSSIBLE_CARDINALITIES = ["0:1", "0:N", "1:1", "1:N"];

// True if there is an N:M relation that has a key
export function nmRelationsWithPK(graph) {
    for (const relation of graph.relations) {
        // Check if the relation is of type N:M
        if (relation.canHoldAttributes) {
            for (const attribute of relation.attributes) {
                // If any attribute has key set to true, return true
                if (attribute.key) {
                    return true;
                }
            }
        }
    }

    // If no N:M relation with a key is found, return false
    return false;
}

export function relationsUnconnected(graph) {
    for (const relation of graph.relations) {
        if (
            !relation.side1.idMx ||
            !relation.side2.idMx ||
            relation.side1.idMx === "" ||
            relation.side2.idMx === ""
        ) {
            return true; // Found an unconnected relation
        }
    }

    return false; // All relations are connected
}

export function brokenRelationEntityReferences(graph) {
    for (const relation of graph.relations) {
        const side1EntityId = relation?.side1?.entity?.idMx;
        const side2EntityId = relation?.side2?.entity?.idMx;

        // Las relaciones no configuradas ya las cubre relationsUnconnected
        if (!side1EntityId || !side2EntityId) {
            continue;
        }

        const side1Exists = getEntityById(graph, side1EntityId) !== null;
        const side2Exists = getEntityById(graph, side2EntityId) !== null;

        if (!side1Exists || !side2Exists) {
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
        const side1Cardinality = relation.side1.cardinality;
        const side2Cardinality = relation.side2.cardinality;

        // Check if the cardinalities are not in the possible list
        if (
            !POSSIBLE_CARDINALITIES.includes(side1Cardinality) ||
            !POSSIBLE_CARDINALITIES.includes(side2Cardinality)
        ) {
            return true; // Found an invalid cardinality
        }
    }

    return false; // All cardinalities are valid
}
