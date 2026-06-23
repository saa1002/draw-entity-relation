import { beforeEach, describe, expect, test } from 'vitest'
import { createRelationSide } from '../../helpers/diagramBuilders'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { RELATION_ARITIES } from '../../../src/domain/er/relations'
import {
    relationsUnconnected,
    validateGraph,
    cardinalitiesNotValid,
    notNMRelationsWithAttributes,
    brokenRelationEntityReferences,
    ternaryRelationsWithAmbiguousRepeatedParticipants,
    identifyingTernaryRelations,
    ternaryRelationsWithMandatoryCardinalities,
} from '../../../src/domain/er/validation'

let graph

const configureTernaryRelation = (
    relation,
    {
        side1EntityId = '2',
        side2EntityId = '3',
        side3EntityId = '19',
        side1Cardinality = '0:1',
        side2Cardinality = '0:N',
        side3Cardinality = '0:N',
        side1Role = '',
        side2Role = '',
        side3Role = '',
    } = {},
) => {
    relation.arity = RELATION_ARITIES.TERNARY
    relation.side1 = createRelationSide({
        idMx: '23',
        entityId: side1EntityId,
        cardinality: side1Cardinality,
        role: side1Role,
        cell: '23',
        edgeId: '',
    })
    relation.side2 = createRelationSide({
        idMx: '24',
        entityId: side2EntityId,
        cardinality: side2Cardinality,
        role: side2Role,
        cell: '24',
        edgeId: '',
    })
    relation.side3 = createRelationSide({
        idMx: '25',
        entityId: side3EntityId,
        cardinality: side3Cardinality,
        role: side3Role,
        cell: '25',
        edgeId: '',
    })
    relation.canHoldAttributes = false
    relation.isIdentifying = false
    relation.attributes = []
}

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe("Connectivity", () => {
    test("Every relation should connect two entities (both sides may reference the same entity)", () => {
        // Ensure the graph is valid initially
        expect(relationsUnconnected(graph)).toBe(false);

        const initializedSide = { 
            cardinality: "",
            cell: "",
            entity: {
                idMx: "",
            },
            idMx: "",
        }

        graph.relations.at(1).side1 = initializedSide;
        graph.relations.at(1).side2 = initializedSide;

        expect(relationsUnconnected(graph)).toBe(true);
        expect(validateGraph(graph).noUnconnectedRelations).toBe(false)
    });

    test("Every relation should reference existing entities", () => {
        expect(brokenRelationEntityReferences(graph)).toBe(false)

        graph.relations.at(1).side1.entity.idMx = "non-existing-entity-id"

        expect(relationsUnconnected(graph)).toBe(false)
        expect(brokenRelationEntityReferences(graph)).toBe(true)
        expect(validateGraph(graph).noBrokenRelationEntityReferences).toBe(false)
    })
})

describe("Attributes in non N:M relations", () => {
    test("A non N:M relation without attributes should be valid", () => {
        expect(notNMRelationsWithAttributes(graph)).toBe(false);

        const diagnostics = validateGraph(graph);

        expect(diagnostics.noAttributesInNonNMRelations).toBe(true);
        expect(diagnostics.isValid).toBe(true);
    });

    test("Non N:M relations cannot have attributes", () => {
        // Ensure the graph is valid initially
        expect(relationsUnconnected(graph)).toBe(false);

        const attributes = [
            {
                "idMx":"9",
                "name":"Atributo",
                "position": {
                    "x":560,
                    "y":130
                },
                "cell":[
                    "9",
                    "10"
                ]
            },
        ]

        graph.relations.at(1).attributes = attributes

        expect(notNMRelationsWithAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noAttributesInNonNMRelations).toBe(false)
    });

    test("Ternary relations can have attributes regardless of maximum cardinalities", () => {
        configureTernaryRelation(graph.relations.at(1), {
            side1Cardinality: '0:1',
            side2Cardinality: '0:1',
            side3Cardinality: '0:1',
        })

        graph.relations.at(1).attributes = [
            {
                idMx: 'ternary-attribute-1',
                name: 'nota',
                position: {
                    x: 560,
                    y: 130,
                },
                cell: [
                    'ternary-attribute-1',
                    'ternary-attribute-edge-1',
                ],
            },
        ]

        const diagnostics = validateGraph(graph)

        expect(notNMRelationsWithAttributes(graph)).toBe(false)
        expect(diagnostics.noAttributesInNonNMRelations).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })
})

describe("Cardinalities", () => {
    test("A standard 1:N relation should be valid", () => {
        graph.relations.at(1).side1.cardinality = "0:N";
        graph.relations.at(1).side2.cardinality = "1:1";

        const diagnostics = validateGraph(graph);

        expect(cardinalitiesNotValid(graph)).toBe(false);
        expect(diagnostics.noNotValidCardinalities).toBe(true);
        expect(diagnostics.isValid).toBe(true);
    });

    test("A fully mandatory 1:1 relation should be valid", () => {
        graph.relations.at(1).side1.cardinality = "1:1";
        graph.relations.at(1).side2.cardinality = "1:1";

        const diagnostics = validateGraph(graph);

        expect(cardinalitiesNotValid(graph)).toBe(false);
        expect(diagnostics.noNotValidCardinalities).toBe(true);
        expect(diagnostics.isValid).toBe(true);
    });
    
    test("Every relation should have valid cardinalities", () => {
        // Ensure the graph is valid initially
        expect(cardinalitiesNotValid(graph)).toBe(false);

        const initializedSide1 = { 
            cardinality: "",
            cell: "20",
            entity: {
                idMx: "",
            },
            idMx: "",
        }

        const initializedSide2 = { 
            cardinality: "",
            cell: "24",
            entity: {
                idMx: "",
            },
            idMx: "",
        }

        graph.relations.at(1).side1 = initializedSide1;
        graph.relations.at(1).side2 = initializedSide2;

        expect(cardinalitiesNotValid(graph)).toBe(true);
        expect(validateGraph(graph).noNotValidCardinalities).toBe(false)
    });    
});

describe("Ternary relationships", () => {
    test("A ternary relation with three configured distinct entities and valid cardinalities should be valid", () => {
        configureTernaryRelation(graph.relations.at(1))

        const diagnostics = validateGraph(graph)

        expect(relationsUnconnected(graph)).toBe(false)
        expect(brokenRelationEntityReferences(graph)).toBe(false)
        expect(cardinalitiesNotValid(graph)).toBe(false)
        expect(ternaryRelationsWithAmbiguousRepeatedParticipants(graph)).toBe(false)
        expect(identifyingTernaryRelations(graph)).toBe(false)
        expect(ternaryRelationsWithMandatoryCardinalities(graph)).toBe(false)
        expect(diagnostics.noUnconnectedRelations).toBe(true)
        expect(diagnostics.noBrokenRelationEntityReferences).toBe(true)
        expect(diagnostics.noNotValidCardinalities).toBe(true)
        expect(diagnostics.noTernaryRelationsWithAmbiguousRepeatedParticipants).toBe(true)
        expect(diagnostics.noIdentifyingTernaryRelations).toBe(true)
        expect(diagnostics.noTernaryRelationsWithMandatoryCardinalities).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test("A ternary relation with an unconfigured entity side should be unconnected", () => {
        configureTernaryRelation(graph.relations.at(1), {
            side3EntityId: '',
        })

        const diagnostics = validateGraph(graph)

        expect(relationsUnconnected(graph)).toBe(true)
        expect(diagnostics.noUnconnectedRelations).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test("A ternary relation should reference existing entities on all sides", () => {
        configureTernaryRelation(graph.relations.at(1), {
            side3EntityId: 'non-existing-entity-id',
        })

        const diagnostics = validateGraph(graph)

        expect(relationsUnconnected(graph)).toBe(false)
        expect(brokenRelationEntityReferences(graph)).toBe(true)
        expect(diagnostics.noBrokenRelationEntityReferences).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test("A ternary relation should have valid cardinalities on all sides", () => {
        configureTernaryRelation(graph.relations.at(1), {
            side3Cardinality: 'X:X',
        })

        const diagnostics = validateGraph(graph)

        expect(cardinalitiesNotValid(graph)).toBe(true)
        expect(diagnostics.noNotValidCardinalities).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test("A ternary relation can repeat a participating entity when repeated roles are distinct", () => {
        configureTernaryRelation(graph.relations.at(1), {
            side2EntityId: '2',
            side1Role: 'tenista local',
            side2Role: 'tenista visitante',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithAmbiguousRepeatedParticipants(graph)).toBe(false)
        expect(diagnostics.noTernaryRelationsWithAmbiguousRepeatedParticipants).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test("A ternary relation with repeated participants requires roles on repeated sides", () => {
        configureTernaryRelation(graph.relations.at(1), {
            side2EntityId: '2',
            side1Role: 'tenista local',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithAmbiguousRepeatedParticipants(graph)).toBe(true)
        expect(diagnostics.noTernaryRelationsWithAmbiguousRepeatedParticipants).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test("A ternary relation with repeated participants requires distinct repeated roles", () => {
        configureTernaryRelation(graph.relations.at(1), {
            side2EntityId: '2',
            side1Role: 'tenista',
            side2Role: 'tenista',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithAmbiguousRepeatedParticipants(graph)).toBe(true)
        expect(diagnostics.noTernaryRelationsWithAmbiguousRepeatedParticipants).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test("A ternary relation with the same entity on all sides is invalid without distinct roles", () => {
        configureTernaryRelation(graph.relations.at(1), {
            side2EntityId: '2',
            side3EntityId: '2',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithAmbiguousRepeatedParticipants(graph)).toBe(true)
        expect(diagnostics.noTernaryRelationsWithAmbiguousRepeatedParticipants).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test("A ternary relation cannot be identifying", () => {
        configureTernaryRelation(graph.relations.at(1))
        graph.relations.at(1).isIdentifying = true

        const diagnostics = validateGraph(graph)

        expect(identifyingTernaryRelations(graph)).toBe(true)
        expect(diagnostics.noIdentifyingTernaryRelations).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test("A ternary relation cannot use mandatory minimum cardinalities", () => {
        configureTernaryRelation(graph.relations.at(1), {
            side2Cardinality: '1:N',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithMandatoryCardinalities(graph)).toBe(true)
        expect(diagnostics.noTernaryRelationsWithMandatoryCardinalities).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test("Binary relations can still use mandatory minimum cardinalities", () => {
        graph.relations.at(1).side1.cardinality = '1:N'
        graph.relations.at(1).side2.cardinality = '1:1'

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithMandatoryCardinalities(graph)).toBe(false)
        expect(diagnostics.noTernaryRelationsWithMandatoryCardinalities).toBe(true)
    })
})