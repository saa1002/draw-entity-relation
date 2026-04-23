import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    entitiesWithoutPK,
    validateGraph,
    weakEntitiesWithoutPartialKey,
    weakEntitiesWithMoreThanOnePartialKey,
    strongEntitiesWithPartialKey,
    weakEntitiesWithoutIdentifyingRelation,
    identifyingRelationsNotValid,
    identifyingRelationCardinalitiesNotValid,
    inconsistentWeakEntityOwnership,
    multipleIdentifyingRelationsPerWeakEntity,
    weakEntitiesWithPrimaryKey,
} from '../../../src/utils/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe("Partial keys", () => {
    test("A weak entity with one partial key should pass partial key presence validation", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.attributes.forEach((attribute, index) => {
            attribute.key = false;
            attribute.partialKey = index === 0;
        });

        expect(weakEntitiesWithoutPartialKey(graph)).toBe(false);
        expect(weakEntitiesWithPrimaryKey(graph)).toBe(false);
        expect(validateGraph(graph).noWeakEntitiesWithoutPartialKey).toBe(true);
    });  

    test("A weak entity must have at least one partial key", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.attributes.forEach((attribute) => {
            attribute.partialKey = false;
        });

        expect(weakEntitiesWithoutPartialKey(graph)).toBe(true);
        expect(validateGraph(graph).noWeakEntitiesWithoutPartialKey).toBe(false);
    });

    test("A weak entity with a single partial key should pass partial key uniqueness validation", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.attributes.forEach((attribute, index) => {
            attribute.partialKey = index === 0;
        });

        expect(weakEntitiesWithMoreThanOnePartialKey(graph)).toBe(false);
        expect(
            validateGraph(graph).noWeakEntitiesWithMoreThanOnePartialKey
        ).toBe(true);
    });

    test("A weak entity cannot have more than one partial key", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.attributes.at(0).partialKey = true;
        weakEntity.attributes.at(1).partialKey = true;

        expect(weakEntitiesWithMoreThanOnePartialKey(graph)).toBe(true);
        expect(
            validateGraph(graph).noWeakEntitiesWithMoreThanOnePartialKey
        ).toBe(false);
    });
});

describe("Partial keys in strong entities", () => {
    test("A strong entity without partial key should pass validation", () => {
        const strongEntity = graph.entities.at(0);

        strongEntity.weak = false;
        strongEntity.attributes.forEach((attribute) => {
            attribute.partialKey = false;
        });

        expect(strongEntitiesWithPartialKey(graph)).toBe(false);
        expect(validateGraph(graph).noStrongEntitiesWithPartialKey).toBe(true);
    });
  
    test("A strong entity cannot have partial key", () => {
        const strongEntity = graph.entities.at(0);

        strongEntity.weak = false;
        strongEntity.attributes.at(0).partialKey = true;

        expect(strongEntitiesWithPartialKey(graph)).toBe(true);
        expect(validateGraph(graph).noStrongEntitiesWithPartialKey).toBe(false);
    });
});

describe("Identifying relation presence", () => {
    test("A weak entity with a valid identifying relation should pass validation", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        weakEntity.identifyingRelationId = relation.idMx;

        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(false);
        expect(validateGraph(graph).noWeakEntitiesWithoutIdentifyingRelation).toBe(true);
    });

    test("A weak entity must have an identifying relation", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.identifyingRelationId = null;

        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(true);
        expect(
            validateGraph(graph).noWeakEntitiesWithoutIdentifyingRelation
        ).toBe(false);
    });

    test("A weak entity cannot reference a non-identifying relation", () => {
        const weakEntity = graph.entities.at(0);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        weakEntity.identifyingRelationId = relation.idMx;
        relation.isIdentifying = false;

        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(true);
        expect(
            validateGraph(graph).noWeakEntitiesWithoutIdentifyingRelation
        ).toBe(false);
    });

    test("A valid identifying relation should pass structure diagnostics", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;
        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        expect(identifyingRelationsNotValid(graph)).toBe(false);
        expect(validateGraph(graph).noInvalidIdentifyingRelations).toBe(true);
    }); 

    test("An identifying relation must connect exactly one weak entity and one strong entity", () => {
        const entity1 = graph.entities.at(0);
        const entity2 = graph.entities.at(1);
        const relation = graph.relations.at(0);

        entity1.weak = false;
        entity2.weak = false;
        relation.isIdentifying = true;

        expect(identifyingRelationsNotValid(graph)).toBe(true);
        expect(validateGraph(graph).noInvalidIdentifyingRelations).toBe(false);
    });    

    test("An identifying relation with valid identifying cardinalities should pass validation", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        relation.side1.cardinality = "0:N";
        relation.side2.cardinality = "1:1";

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(false);
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(true);
    });

    test("An identifying relation should also allow 1:N on the weak side", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        relation.side1.cardinality = "1:N";
        relation.side2.cardinality = "1:1";

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(false);
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(true);
    });

    test("An identifying relation is invalid if the strong side is not 1:1", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        relation.side1.cardinality = "0:N";
        relation.side2.cardinality = "0:1";

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(true);
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(false);
    });

    test("An identifying relation is invalid if the weak side is not N-based", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        relation.side1.cardinality = "0:1";
        relation.side2.cardinality = "1:1";

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(true);
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(false);
    });
});

describe("Ownership consistency", () => {
    test("A weak entity with consistent owner and identifying relation should pass ownership validation", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        weakEntity.identifyingRelationId = relation.idMx;
        weakEntity.ownerEntityId = strongEntity.idMx;

        expect(inconsistentWeakEntityOwnership(graph)).toBe(false);
        expect(validateGraph(graph).noInconsistentWeakEntityOwnership).toBe(true);
    });

    test("A weak entity must be connected to its identifying relation", () => {
        const weakEntity = graph.entities.at(0);
        const ownerEntity = graph.entities.at(1);
        const relation = graph.relations.at(1);

        weakEntity.weak = true;
        weakEntity.identifyingRelationId = relation.idMx;
        weakEntity.ownerEntityId = ownerEntity.idMx;
        relation.isIdentifying = true;

        expect(inconsistentWeakEntityOwnership(graph)).toBe(true);
        expect(validateGraph(graph).noInconsistentWeakEntityOwnership).toBe(false);
    });

    test("A weak entity owner must match the strong entity on the other side", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        weakEntity.identifyingRelationId = relation.idMx;
        weakEntity.ownerEntityId = graph.entities.at(2).idMx;

        expect(inconsistentWeakEntityOwnership(graph)).toBe(true);
        expect(validateGraph(graph).noInconsistentWeakEntityOwnership).toBe(false);
    });
});

describe("Identifying relation uniqueness", () => {
    test("A weak entity with a single identifying relationship should pass uniqueness validation", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        expect(multipleIdentifyingRelationsPerWeakEntity(graph)).toBe(false);
        expect(
            validateGraph(graph).noMultipleIdentifyingRelationsPerWeakEntity,
        ).toBe(true);
    });

    test("A weak entity cannot participate in more than one identifying relationship", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity1 = graph.entities.at(1);
        const strongEntity2 = graph.entities.at(2);

        const relation1 = graph.relations.at(0);
        const relation2 = graph.relations.at(1);

        weakEntity.weak = true;
        strongEntity1.weak = false;
        strongEntity2.weak = false;

        relation1.isIdentifying = true;
        relation1.side1.entity.idMx = weakEntity.idMx;
        relation1.side2.entity.idMx = strongEntity1.idMx;

        relation2.isIdentifying = true;
        relation2.side1.entity.idMx = weakEntity.idMx;
        relation2.side2.entity.idMx = strongEntity2.idMx;

        expect(multipleIdentifyingRelationsPerWeakEntity(graph)).toBe(true);
        expect(
            validateGraph(graph).noMultipleIdentifyingRelationsPerWeakEntity,
        ).toBe(false);
    });
});

describe("Regular primary keys in weak entities", () => {
    test("A weak entity without a regular primary key should pass validation", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;

        weakEntity.attributes.forEach((attribute, index) => {
            attribute.key = false;
            attribute.partialKey = index === 0;
        });

        expect(weakEntitiesWithPrimaryKey(graph)).toBe(false);
        expect(validateGraph(graph).noWeakEntitiesWithPrimaryKey).toBe(true);
    });

    test("A weak entity cannot have a regular primary key", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;

        weakEntity.attributes.forEach((attribute, index) => {
            attribute.key = index === 0;
            attribute.partialKey = false;
        });

        expect(weakEntitiesWithPrimaryKey(graph)).toBe(true);
        expect(validateGraph(graph).noWeakEntitiesWithPrimaryKey).toBe(false);
    });
});

describe("Interaction with strong entity PK validation", () => {
    test("Weak entities should not fail strong entity primary key validation", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.attributes.forEach((attribute) => {
            attribute.key = false;
        });

        expect(entitiesWithoutPK(graph)).toBe(false);
        expect(validateGraph(graph).noEntitiesWithoutPK).toBe(true);
    });
});

describe("Canonical valid configuration", () => {
    test("A canonical weak entity configuration should be valid", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        weakEntity.attributes.forEach((attribute, index) => {
            attribute.key = false;
            attribute.partialKey = index === 0;
        });

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;
        relation.side1.cardinality = "0:N";
        relation.side2.cardinality = "1:1";

        weakEntity.identifyingRelationId = relation.idMx;
        weakEntity.ownerEntityId = strongEntity.idMx;

        const diagnostics = validateGraph(graph);

        expect(weakEntitiesWithoutPartialKey(graph)).toBe(false);
        expect(weakEntitiesWithMoreThanOnePartialKey(graph)).toBe(false);
        expect(weakEntitiesWithPrimaryKey(graph)).toBe(false);
        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(false);
        expect(identifyingRelationsNotValid(graph)).toBe(false);
        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(false);
        expect(inconsistentWeakEntityOwnership(graph)).toBe(false);
        expect(multipleIdentifyingRelationsPerWeakEntity(graph)).toBe(false);
        expect(diagnostics.isValid).toBe(true);
    });
});