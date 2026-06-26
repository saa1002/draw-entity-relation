import {
    getPrimaryKeyAttributesInTree,
    hasPrimaryKeyAttributeInTree,
} from "../../attributes";
import { isWeakEntity } from "../../entities";
import { isEntityIsaSpecialization } from "./isaRules";

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

export function entitiesWithMoreThanOnePK(graph) {
    for (const entity of graph.entities) {
        if (isEntityIsaSpecialization(graph, entity.idMx)) continue;

        if (getPrimaryKeyAttributesInTree(entity.attributes).length > 1) {
            return true;
        }
    }

    return false;
}

export function entitiesWithoutAttributes(graph) {
    for (const entity of graph.entities) {
        if (isEntityIsaSpecialization(graph, entity.idMx)) continue;

        if (!entity.attributes || entity.attributes.length === 0) {
            return true;
        }
    }

    return false;
}
