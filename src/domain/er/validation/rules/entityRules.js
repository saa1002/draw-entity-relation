import {
    getPrimaryKeyAttributesInTree,
    hasPrimaryKeyAttributeInTree,
} from "../../attributes";
import { isWeakEntity } from "../../entities";
import { isEntityIsaSpecialization } from "../../isa";

// Entity validation rules. ISA specializations are treated specially because
// their primary key is inherited from the generalization entity.

// Entities and relations share the same SQL table namespace, so repeated names
// are checked across both collections.
export function repeatedEntities(graph) {
    const entityNames = new Set();

    for (const entity of graph.entities) {
        if (entityNames.has(entity.name)) {
            return true;
        }
        entityNames.add(entity.name);
    }

    for (const relation of graph.relations) {
        if (entityNames.has(relation.name)) {
            return true;
        }
        entityNames.add(relation.name);
    }

    return false;
}

// Weak entities use partial keys and ISA specializations inherit their key, so
// only regular strong entities are required to define their own primary key.
export function entitiesWithoutPK(graph) {
    for (const entity of graph.entities) {
        if (isWeakEntity(entity)) continue;

        if (isEntityIsaSpecialization(graph, entity.idMx)) continue;

        if (!hasPrimaryKeyAttributeInTree(entity.attributes)) {
            return true;
        }
    }

    return false;
}

// The editor supports a single primary-key attribute marker per entity. Composite
// keys can be represented through composite attributes rather than multiple roots.
export function entitiesWithMoreThanOnePK(graph) {
    for (const entity of graph.entities) {
        if (isEntityIsaSpecialization(graph, entity.idMx)) continue;

        if (getPrimaryKeyAttributesInTree(entity.attributes).length > 1) {
            return true;
        }
    }

    return false;
}

// ISA specializations may be valid without own attributes because they still
// inherit the generalization key during relational transformation.
export function entitiesWithoutAttributes(graph) {
    for (const entity of graph.entities) {
        if (isEntityIsaSpecialization(graph, entity.idMx)) continue;

        if (!entity.attributes || entity.attributes.length === 0) {
            return true;
        }
    }

    return false;
}
