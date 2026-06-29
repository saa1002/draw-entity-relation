import {
    getAttributeChildren,
    hasEmptyCompositeAttributeInTree,
    hasMultivaluedAttributeInTree,
    hasRepeatedSiblingAttributeNamesInTree,
    isMultivaluedAttribute,
    someAttributeInTree,
} from "../../attributes";
import { canRelationHoldAttributes } from "../../relations";

// Attribute validation rules for the tree-shaped attribute model. The editor
// supports composite attributes, but nested composites and some multivalued
// combinations are intentionally rejected before transformation.
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

// Only entities and relations that are allowed to own attributes are checked here.
const getValidAttributeOwnerCollections = (graph) => [
    ...getEntityAttributeCollections(graph),
    ...getRelationAttributeCollections(graph),
];

const someAttributeOwnerMatches = (graph, predicate) =>
    getValidAttributeOwnerCollections(graph).some(predicate);

// Repeated attribute names are checked independently inside each attribute owner.
export function repeatedAttributesInEntity(graph) {
    return someAttributeOwnerMatches(
        graph,
        hasRepeatedSiblingAttributeNamesInTree,
    );
}

export function emptyCompositeAttributes(graph) {
    return someAttributeOwnerMatches(graph, hasEmptyCompositeAttributeInTree);
}

// The supported model allows one composite level, but not composites nested
// inside other composite attributes.
const hasNestedCompositeAttribute = (attributes = []) =>
    someAttributeInTree(
        attributes,
        (attribute, { depth }) =>
            depth > 0 && getAttributeChildren(attribute).length > 0,
    );

export function nestedCompositeAttributes(graph) {
    return someAttributeOwnerMatches(graph, hasNestedCompositeAttribute);
}

// Composite multivalued attributes cannot contain key, partial-key or nested
// multivalued semantics in the current relational transformation.
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

// Multivalued attributes are supported only for entity attributes and under the
// simplified shapes that can be mapped to auxiliary relational tables.
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
