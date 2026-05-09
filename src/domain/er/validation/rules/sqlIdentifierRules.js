import { normalizeIdentifier } from "../../../relational/naming";

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
