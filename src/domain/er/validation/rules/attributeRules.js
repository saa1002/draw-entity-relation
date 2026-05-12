import {
    getAttributeChildren,
    isCompositeAttribute,
    isMultivaluedAttribute,
    walkAttributeTree,
} from "../../attributes";

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

            if (hasRepeatedAttributes(getAttributeChildren(attribute))) {
                return true;
            }
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

export function emptyCompositeAttributes(graph) {
    const hasEmptyCompositeAttribute = (attributes = []) => {
        for (const attribute of attributes) {
            if (
                Array.isArray(attribute.children) &&
                attribute.children.length === 0
            ) {
                return true;
            }

            if (hasEmptyCompositeAttribute(getAttributeChildren(attribute))) {
                return true;
            }
        }

        return false;
    };

    for (const entity of graph.entities) {
        if (hasEmptyCompositeAttribute(entity.attributes)) {
            return true;
        }
    }

    for (const relation of graph.relations) {
        if (
            relation.canHoldAttributes &&
            hasEmptyCompositeAttribute(relation.attributes)
        ) {
            return true;
        }
    }

    return false;
}

export function unsupportedMultivaluedAttributes(graph) {
    const hasUnsupportedEntityMultivaluedAttribute = (attributes = []) => {
        let hasUnsupportedAttribute = false;

        walkAttributeTree(attributes, (attribute, { depth }) => {
            if (hasUnsupportedAttribute || !isMultivaluedAttribute(attribute)) {
                return;
            }

            if (
                depth > 0 ||
                attribute.key ||
                attribute.partialKey ||
                isCompositeAttribute(attribute)
            ) {
                hasUnsupportedAttribute = true;
            }
        });

        return hasUnsupportedAttribute;
    };

    const hasAnyMultivaluedAttribute = (attributes = []) => {
        let hasMultivaluedAttribute = false;

        walkAttributeTree(attributes, (attribute) => {
            if (isMultivaluedAttribute(attribute)) {
                hasMultivaluedAttribute = true;
            }
        });

        return hasMultivaluedAttribute;
    };

    for (const entity of graph.entities) {
        if (hasUnsupportedEntityMultivaluedAttribute(entity.attributes)) {
            return true;
        }
    }

    for (const relation of graph.relations) {
        if (hasAnyMultivaluedAttribute(relation.attributes)) {
            return true;
        }
    }

    return false;
}
