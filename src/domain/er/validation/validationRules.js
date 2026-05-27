import {
    brokenIsaEntityReferences,
    brokenRelationEntityReferences,
    cardinalitiesNotValid,
    emptyCompositeAttributes,
    entitiesWithMoreThanOnePK,
    entitiesWithoutAttributes,
    entitiesWithoutPK,
    identifyingRelationCardinalitiesNotValid,
    identifyingRelationsNotValid,
    identifyingTernaryRelations,
    inconsistentWeakEntityOwnership,
    isaHierarchiesUnconnected,
    isaHierarchiesWithGeneralizationAsSpecialization,
    isaHierarchiesWithRepeatedSpecializations,
    isaSpecializationsWithPrimaryKey,
    multipleIdentifyingRelationsPerWeakEntity,
    nestedCompositeAttributes,
    nmRelationsWithPK,
    notNMRelationsWithAttributes,
    relationsUnconnected,
    repeatedAttributesInEntity,
    repeatedEntities,
    sqlIdentifierCollisions,
    strongEntitiesWithPartialKey,
    ternaryRelationsWithAmbiguousRepeatedParticipants,
    ternaryRelationsWithMandatoryCardinalities,
    unsupportedMultivaluedAttributes,
    weakEntitiesWithMoreThanOnePartialKey,
    weakEntitiesWithPrimaryKey,
    weakEntitiesWithoutIdentifyingRelation,
    weakEntitiesWithoutPartialKey,
} from "./rules";

export const VALIDATION_RULES = [
    {
        diagnostic: "notEmpty",
        fails: (graph) =>
            graph.entities.length === 0 &&
            graph.relations.length === 0 &&
            (graph.isas?.length ?? 0) === 0,
    },
    {
        diagnostic: "noRepeatedNames",
        fails: repeatedEntities,
    },
    {
        diagnostic: "noRepeatedAttrNames",
        fails: repeatedAttributesInEntity,
    },
    {
        diagnostic: "noEmptyCompositeAttributes",
        fails: emptyCompositeAttributes,
    },
    {
        diagnostic: "noNestedCompositeAttributes",
        fails: nestedCompositeAttributes,
    },
    {
        diagnostic: "noUnsupportedMultivaluedAttributes",
        fails: unsupportedMultivaluedAttributes,
    },
    {
        diagnostic: "noEntitiesWithoutAttributes",
        fails: entitiesWithoutAttributes,
    },
    {
        diagnostic: "noEntitiesWithoutPK",
        fails: entitiesWithoutPK,
    },
    {
        diagnostic: "noEntitiesWithMoreThanOnePK",
        fails: entitiesWithMoreThanOnePK,
    },
    {
        diagnostic: "noNMRelationsWithPK",
        fails: nmRelationsWithPK,
    },
    {
        diagnostic: "noAttributesInNonNMRelations",
        fails: notNMRelationsWithAttributes,
    },
    {
        diagnostic: "noUnconnectedRelations",
        fails: relationsUnconnected,
    },
    {
        diagnostic: "noNotValidCardinalities",
        fails: cardinalitiesNotValid,
    },
    {
        diagnostic: "noBrokenRelationEntityReferences",
        fails: brokenRelationEntityReferences,
    },
    {
        diagnostic: "noUnconnectedIsas",
        fails: isaHierarchiesUnconnected,
    },
    {
        diagnostic: "noBrokenIsaEntityReferences",
        fails: brokenIsaEntityReferences,
    },
    {
        diagnostic: "noIsaHierarchiesWithRepeatedSpecializations",
        fails: isaHierarchiesWithRepeatedSpecializations,
    },
    {
        diagnostic: "noIsaHierarchiesWithGeneralizationAsSpecialization",
        fails: isaHierarchiesWithGeneralizationAsSpecialization,
    },
    {
        diagnostic: "noIsaSpecializationsWithPrimaryKey",
        fails: isaSpecializationsWithPrimaryKey,
    },
    {
        diagnostic: "noTernaryRelationsWithAmbiguousRepeatedParticipants",
        fails: ternaryRelationsWithAmbiguousRepeatedParticipants,
    },
    {
        diagnostic: "noIdentifyingTernaryRelations",
        fails: identifyingTernaryRelations,
    },
    {
        diagnostic: "noTernaryRelationsWithMandatoryCardinalities",
        fails: ternaryRelationsWithMandatoryCardinalities,
    },
    {
        diagnostic: "noSQLIdentifierCollisions",
        fails: sqlIdentifierCollisions,
    },
    {
        diagnostic: "noWeakEntitiesWithoutPartialKey",
        fails: weakEntitiesWithoutPartialKey,
    },
    {
        diagnostic: "noWeakEntitiesWithMoreThanOnePartialKey",
        fails: weakEntitiesWithMoreThanOnePartialKey,
    },
    {
        diagnostic: "noWeakEntitiesWithPrimaryKey",
        fails: weakEntitiesWithPrimaryKey,
    },
    {
        diagnostic: "noStrongEntitiesWithPartialKey",
        fails: strongEntitiesWithPartialKey,
    },
    {
        diagnostic: "noWeakEntitiesWithoutIdentifyingRelation",
        fails: weakEntitiesWithoutIdentifyingRelation,
    },
    {
        diagnostic: "noInvalidIdentifyingRelations",
        fails: identifyingRelationsNotValid,
    },
    {
        diagnostic: "noInvalidIdentifyingCardinalities",
        fails: identifyingRelationCardinalitiesNotValid,
    },
    {
        diagnostic: "noInconsistentWeakEntityOwnership",
        fails: inconsistentWeakEntityOwnership,
    },
    {
        diagnostic: "noMultipleIdentifyingRelationsPerWeakEntity",
        fails: multipleIdentifyingRelationsPerWeakEntity,
    },
];
