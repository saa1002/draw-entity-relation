import {
    getAttributeChildren,
    hasEmptyCompositeAttributeInTree,
    hasMultivaluedAttributeInTree,
    hasRepeatedSiblingAttributeNamesInTree,
    isMultivaluedAttribute,
    someAttributeInTree,
} from "../../attributes";

// This function checks for repeated attributes in an entity,
// relations N:M (these are the ones that have a key `canHoldAttributes`
// set to true) are also treated as entities.
// Returns true if there are repeated attribute names in any entity
// false if there are no repetitions.
// NOTE: Every entity should be treated differently; there can be repeated
// attributes in different entities.
export function repeatedAttributesInEntity(graph) {
    for (const entity of graph.entities) {
        if (hasRepeatedSiblingAttributeNamesInTree(entity.attributes)) {
            return true;
        }
    }

    for (const relation of graph.relations) {
        if (
            relation.canHoldAttributes &&
            hasRepeatedSiblingAttributeNamesInTree(relation.attributes)
        ) {
            return true;
        }
    }

    return false;
}

export function emptyCompositeAttributes(graph) {
    for (const entity of graph.entities) {
        if (hasEmptyCompositeAttributeInTree(entity.attributes)) {
            return true;
        }
    }

    for (const relation of graph.relations) {
        if (
            relation.canHoldAttributes &&
            hasEmptyCompositeAttributeInTree(relation.attributes)
        ) {
            return true;
        }
    }

    return false;
}

export function unsupportedMultivaluedAttributes(graph) {
    const hasUnsupportedCompositeMultivaluedChild = (attribute) =>
        someAttributeInTree(
            getAttributeChildren(attribute),
            (childAttribute) =>
                isMultivaluedAttribute(childAttribute) ||
                childAttribute.key ||
                childAttribute.partialKey,
        );

    const hasUnsupportedEntityMultivaluedAttribute = (attributes = []) =>
        someAttributeInTree(
            attributes,
            (attribute, { depth }) =>
                isMultivaluedAttribute(attribute) &&
                (depth > 0 ||
                    attribute.key ||
                    attribute.partialKey ||
                    hasUnsupportedCompositeMultivaluedChild(attribute)),
        );

    for (const entity of graph.entities) {
        if (hasUnsupportedEntityMultivaluedAttribute(entity.attributes)) {
            return true;
        }
    }

    for (const relation of graph.relations) {
        if (hasMultivaluedAttributeInTree(relation.attributes)) {
            return true;
        }
    }

    return false;
}
