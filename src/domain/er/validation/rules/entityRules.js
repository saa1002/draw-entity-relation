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

export function entitiesWithoutAttributes(graph) {
    // Check entities
    for (const entity of graph.entities) {
        if (!entity.attributes || entity.attributes.length === 0) {
            return true; // Found an entity without attributes
        }
    }

    return false; // No entities or N:M relations without attributes found
}
