import { normalizeIdentifier } from "./sql";

export function validateGraph(graph) {
    const diagnostics = {
        noRepeatedNames: true,
        noRepeatedAttrNames: true,
        noEntitiesWithoutAttributes: true,
        noEntitiesWithoutPK: true,
        noEntitiesWithMoreThanOnePK: true,
        noNMRelationsWithPK: true,
        noUnconnectedRelations: true,
        noAttributesInNonNMRelations: true,
        noBrokenRelationEntityReferences: true,
        noNotValidCardinalities: true,
        noSQLIdentifierCollisions: true,
        noWeakEntitiesWithoutPartialKey: true,
        noWeakEntitiesWithMoreThanOnePartialKey: true,
        noWeakEntitiesWithPrimaryKey: true,
        noStrongEntitiesWithPartialKey: true,
        noWeakEntitiesWithoutIdentifyingRelation: true,
        noInvalidIdentifyingRelations: true,
        noInvalidIdentifyingCardinalities: true,
        noInconsistentWeakEntityOwnership: true,
        noMultipleIdentifyingRelationsPerWeakEntity: true,
        notEmpty: true,
        isValid: true,
    };

    // The graph is empty
    if (graph.entities.length === 0 && graph.relations.length === 0) {
        diagnostics.notEmpty = false;
        diagnostics.isValid = false;
    }

    // Check for repeated entity names
    if (repeatedEntities(graph)) {
        diagnostics.noRepeatedNames = false;
        diagnostics.isValid = false;
    }

    // Check for repeated attribute names in the same entity
    if (repeatedAttributesInEntity(graph)) {
        diagnostics.noRepeatedAttrNames = false;
        diagnostics.isValid = false;
    }

    // Check for entities without attributes
    if (entitiesWithoutAttributes(graph)) {
        diagnostics.noEntitiesWithoutAttributes = false;
        diagnostics.isValid = false;
    }

    // Check for entities without a primary key attribute
    if (entitiesWithoutPK(graph)) {
        diagnostics.noEntitiesWithoutPK = false;
        diagnostics.isValid = false;
    }

    // Check for entities with more than one primary key
    if (entitiesWithMoreThanOnePK(graph)) {
        diagnostics.noEntitiesWithMoreThanOnePK = false;
        diagnostics.isValid = false;
    }

    // Check for NM relations with a primary key
    if (nmRelationsWithPK(graph)) {
        diagnostics.noNMRelationsWithPK = false;
        diagnostics.isValid = false;
    }

    if (notNMRelationsWithAttributes(graph)) {
        diagnostics.noAttributesInNonNMRelations = false;
        diagnostics.isValid = false;
    }

    // Check for unconnected relations
    if (relationsUnconnected(graph)) {
        diagnostics.noUnconnectedRelations = false;
        diagnostics.isValid = false;
    }

    // Check for relations with invalid cardinalities
    if (cardinalitiesNotValid(graph)) {
        diagnostics.noNotValidCardinalities = false;
        diagnostics.isValid = false;
    }

    if (brokenRelationEntityReferences(graph)) {
        diagnostics.noBrokenRelationEntityReferences = false;
        diagnostics.isValid = false;
    }

    if (sqlIdentifierCollisions(graph)) {
        diagnostics.noSQLIdentifierCollisions = false;
        diagnostics.isValid = false;
    }

    if (weakEntitiesWithoutPartialKey(graph)) {
        diagnostics.noWeakEntitiesWithoutPartialKey = false;
        diagnostics.isValid = false;
    }

    if (weakEntitiesWithMoreThanOnePartialKey(graph)) {
        diagnostics.noWeakEntitiesWithMoreThanOnePartialKey = false;
        diagnostics.isValid = false;
    }

    if (weakEntitiesWithPrimaryKey(graph)) {
        diagnostics.noWeakEntitiesWithPrimaryKey = false;
        diagnostics.isValid = false;
    }

    if (strongEntitiesWithPartialKey(graph)) {
        diagnostics.noStrongEntitiesWithPartialKey = false;
        diagnostics.isValid = false;
    }

    if (weakEntitiesWithoutIdentifyingRelation(graph)) {
        diagnostics.noWeakEntitiesWithoutIdentifyingRelation = false;
        diagnostics.isValid = false;
    }

    if (identifyingRelationsNotValid(graph)) {
        diagnostics.noInvalidIdentifyingRelations = false;
        diagnostics.isValid = false;
    }

    if (identifyingRelationCardinalitiesNotValid(graph)) {
        diagnostics.noInvalidIdentifyingCardinalities = false;
        diagnostics.isValid = false;
    }

    if (inconsistentWeakEntityOwnership(graph)) {
        diagnostics.noInconsistentWeakEntityOwnership = false;
        diagnostics.isValid = false;
    }

    if (multipleIdentifyingRelationsPerWeakEntity(graph)) {
        diagnostics.noMultipleIdentifyingRelationsPerWeakEntity = false;
        diagnostics.isValid = false;
    }

    return diagnostics;
}

function getEntityById(graph, entityId) {
    return graph.entities.find((entity) => entity.idMx === entityId) ?? null;
}

function relationConnectsEntity(relation, entityId) {
    return (
        relation?.side1?.entity?.idMx === entityId ||
        relation?.side2?.entity?.idMx === entityId
    );
}

// This function check for repeated entity name, relations
// can't be repeated also
// Returns true if there are repeated entity names
// false if there are not repeated entity names
export function repeatedEntities(graph) {
    const entityNames = new Set();

    for (const entity of graph.entities) {
        if (entityNames.has(entity.name)) {
            return true; // Found a duplicate name
        }
        entityNames.add(entity.name);
    }

    // Check for relations as well
    for (const relation of graph.relations) {
        if (entityNames.has(relation.name)) {
            return true; // Found a duplicate name
        }
        entityNames.add(relation.name);
    }

    return false; // No duplicates found
}

// This function checks for repeated attributes in an entity,
// relations N:M (these are the ones that have a key `canHoldAttributes`
// set to true) are also treated as entities.
// Returns true if there are repeated attribute names in any entity
// false if there are no repetitions.
// NOTE: Every entity should be treated differently; there can be repeated
// attributes in different entities.
export function repeatedAttributesInEntity(graph) {
    const hasRepeatedAttributes = (attributes) => {
        const attributeNames = new Set();
        for (const attribute of attributes) {
            if (attributeNames.has(attribute.name)) {
                return true;
            }
            attributeNames.add(attribute.name);
        }
        return false;
    };

    // Check entities for repeated attributes
    for (const entity of graph.entities) {
        if (hasRepeatedAttributes(entity.attributes)) {
            return true;
        }
    }

    // Check N:M relations for repeated attributes
    for (const relation of graph.relations) {
        if (
            relation.canHoldAttributes &&
            hasRepeatedAttributes(relation.attributes)
        ) {
            return true;
        }
    }

    return false; // No repeated attributes found in any entity or N:M relation
}

// False if every entity has at least a key
// True if there is an entity that hasn't a key
export function entitiesWithoutPK(graph) {
    // Check entities
    for (const entity of graph.entities) {
        if (entity.weak) continue;
        let hasPrimaryKey = false;
        for (const attribute of entity.attributes) {
            // Check if there is at least one attribute with key set to true
            if (attribute.key) {
                hasPrimaryKey = true;
                break;
            }
        }
        // If no primary key found for the current entity, return true
        if (!hasPrimaryKey) {
            return true;
        }
    }
    // If all entities have at least one primary key, return false
    return false;
}

// True if there is an entity that has two or more keys
export function entitiesWithMoreThanOnePK(graph) {
    for (const entity of graph.entities) {
        let primaryKeyCount = 0;
        for (const attribute of entity.attributes) {
            if (attribute.key) {
                primaryKeyCount++;
                // If more than one primary key is found, return true
                if (primaryKeyCount > 1) {
                    return true;
                }
            }
        }
    }
    // If no entity with more than one primary key is found, return false
    return false;
}

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

export function entitiesWithoutAttributes(graph) {
    // Check entities
    for (const entity of graph.entities) {
        if (!entity.attributes || entity.attributes.length === 0) {
            return true; // Found an entity without attributes
        }
    }

    return false; // No entities or N:M relations without attributes found
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

export const POSSIBLE_CARDINALITIES = ["0:1", "0:N", "1:1", "1:N"];

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

export function sqlIdentifierCollisions(graph) {
    const normalizedNames = new Set();

    // Entidades y relaciones comparten namespace de tablas
    for (const entity of graph.entities) {
        const normalized = normalizeIdentifier(entity.name);
        if (normalizedNames.has(normalized)) {
            return true;
        }
        normalizedNames.add(normalized);
    }

    for (const relation of graph.relations) {
        const normalized = normalizeIdentifier(relation.name);
        if (normalizedNames.has(normalized)) {
            return true;
        }
        normalizedNames.add(normalized);
    }

    const hasNormalizedAttributeCollision = (attributes) => {
        const normalizedAttrNames = new Set();

        for (const attribute of attributes) {
            const normalized = normalizeIdentifier(attribute.name);
            if (normalizedAttrNames.has(normalized)) {
                return true;
            }
            normalizedAttrNames.add(normalized);
        }

        return false;
    };

    for (const entity of graph.entities) {
        if (hasNormalizedAttributeCollision(entity.attributes || [])) {
            return true;
        }
    }

    for (const relation of graph.relations) {
        if (
            relation.canHoldAttributes &&
            hasNormalizedAttributeCollision(relation.attributes || [])
        ) {
            return true;
        }
    }

    return false;
}

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

        const side1EntityId = relation.side1?.entity?.idMx;
        const side2EntityId = relation.side2?.entity?.idMx;

        if (!side1EntityId || !side2EntityId) {
            return true;
        }

        const entity1 = getEntityById(graph, side1EntityId);
        const entity2 = getEntityById(graph, side2EntityId);

        if (!entity1 || !entity2) {
            return true;
        }

        const weakCount = [entity1, entity2].filter(
            (entity) => entity.weak === true,
        ).length;

        const strongCount = [entity1, entity2].filter(
            (entity) => entity.weak !== true,
        ).length;

        if (weakCount !== 1 || strongCount !== 1) {
            return true;
        }
    }

    return false;
}

export function identifyingRelationCardinalitiesNotValid(graph) {
    for (const relation of graph.relations) {
        if (!relation.isIdentifying) continue;

        const side1EntityId = relation.side1?.entity?.idMx;
        const side2EntityId = relation.side2?.entity?.idMx;

        if (!side1EntityId || !side2EntityId) {
            continue;
        }

        const entity1 = getEntityById(graph, side1EntityId);
        const entity2 = getEntityById(graph, side2EntityId);

        if (!entity1 || !entity2) {
            continue;
        }

        const side1IsWeak = entity1.weak === true;
        const side2IsWeak = entity2.weak === true;

        if (side1IsWeak === side2IsWeak) {
            continue;
        }

        const weakSide = side1IsWeak ? relation.side1 : relation.side2;
        const strongSide = side1IsWeak ? relation.side2 : relation.side1;

        const weakCardinalityIsValid = ["0:N", "1:N"].includes(
            weakSide.cardinality,
        );
        const strongCardinalityIsValid = strongSide.cardinality === "1:1";

        if (!weakCardinalityIsValid || !strongCardinalityIsValid) {
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

        if (!relation) {
            return true;
        }

        if (!relationConnectsEntity(relation, entity.idMx)) {
            return true;
        }

        const side1Id = relation?.side1?.entity?.idMx;
        const side2Id = relation?.side2?.entity?.idMx;
        const ownerId = side1Id === entity.idMx ? side2Id : side1Id;

        if (!ownerId) {
            return true;
        }

        if (entity.ownerEntityId !== ownerId) {
            return true;
        }

        const ownerEntity = getEntityById(graph, ownerId);

        if (!ownerEntity || ownerEntity.weak) {
            return true;
        }
    }

    return false;
}

export function multipleIdentifyingRelationsPerWeakEntity(graph) {
    for (const entity of graph.entities) {
        if (!entity.weak) continue;

        const identifyingRelations = graph.relations.filter((relation) => {
            if (!relation.isIdentifying) return false;

            return (
                relation?.side1?.entity?.idMx === entity.idMx ||
                relation?.side2?.entity?.idMx === entity.idMx
            );
        });

        if (identifyingRelations.length > 1) {
            return true;
        }
    }

    return false;
}
