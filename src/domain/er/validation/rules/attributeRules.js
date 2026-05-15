import {
    getAttributeChildren,
    hasEmptyCompositeAttributeInTree,
    hasMultivaluedAttributeInTree,
    hasRepeatedSiblingAttributeNamesInTree,
    isMultivaluedAttribute,
    someAttributeInTree,
} from "../../attributes";
import { canRelationHoldAttributes } from "../../relations";
const getEntities = (graph) =>
    Array.isArray(graph?.entities) ? graph.entities : [];

const getRelations = (graph) =>
    Array.isArray(graph?.relations) ? graph.relations : [];

const getEntityAttributeCollections = (graph) =>
    getEntities(graph).map((entity) => entity.attributes ?? []);

const getRelationAttributeCollections = (
    graph,
    { onlyAttributeHoldingRelations = true } = {},
) =>
    getRelations(graph)
        .filter(
            (relation) =>
                !onlyAttributeHoldingRelations ||
                canRelationHoldAttributes(relation),
        )
        .map((relation) => relation.attributes ?? []);

const getValidAttributeOwnerCollections = (graph) => [
    ...getEntityAttributeCollections(graph),
    ...getRelationAttributeCollections(graph),
];

const someAttributeOwnerMatches = (graph, predicate) =>
    getValidAttributeOwnerCollections(graph).some(predicate);

// This function checks for repeated attributes in an entity,
// relations N:M (these are the ones that have a key `canHoldAttributes`
// set to true) are also treated as entities.
// Returns true if there are repeated attribute names in any entity
// false if there are no repetitions.
// NOTE: Every entity should be treated differently; there can be repeated
// attributes in different entities.
export function repeatedAttributesInEntity(graph) {
    return someAttributeOwnerMatches(
        graph,
        hasRepeatedSiblingAttributeNamesInTree,
    );
}

export function emptyCompositeAttributes(graph) {
    return someAttributeOwnerMatches(graph, hasEmptyCompositeAttributeInTree);
}

const hasNestedCompositeAttribute = (attributes = []) =>
    someAttributeInTree(
        attributes,
        (attribute, { depth }) =>
            depth > 0 && getAttributeChildren(attribute).length > 0,
    );

export function nestedCompositeAttributes(graph) {
    return someAttributeOwnerMatches(graph, hasNestedCompositeAttribute);
}

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

export function unsupportedMultivaluedAttributes(graph) {
    const hasUnsupportedEntityAttribute = getEntityAttributeCollections(
        graph,
    ).some(hasUnsupportedEntityMultivaluedAttribute);

    if (hasUnsupportedEntityAttribute) {
        return true;
    }

    return getRelationAttributeCollections(graph, {
        onlyAttributeHoldingRelations: false,
    }).some(hasMultivaluedAttributeInTree);
}
