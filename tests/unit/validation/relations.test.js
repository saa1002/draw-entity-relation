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

const getEditableRelation = () => graph.relations.at(1)

const createUnconfiguredSide = ({ cell = '' } = {}) =>
    createRelationSide({
        idMx: '',
        entityId: '',
        cardinality: '',
        cell,
    })

const createRelationAttribute = ({
    idMx = 'relation-attribute',
    name = 'Atributo',
    edgeId = 'relation-attribute-edge',
} = {}) => ({
    idMx,
    name,
    position: {
        x: 560,
        y: 130,
    },
    cell: [idMx, edgeId],
})

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

describe('Relation connectivity', () => {
    test('Every relation should connect two entities, allowing both sides to reference the same entity', () => {
        const relation = getEditableRelation()

        relation.side1 = createUnconfiguredSide()
        relation.side2 = createUnconfiguredSide()

        expect(relationsUnconnected(graph)).toBe(true)
        expect(validateGraph(graph).noUnconnectedRelations).toBe(false)
    })

    test('Every relation should reference existing entities', () => {
        const relation = getEditableRelation()

        relation.side1.entity.idMx = 'non-existing-entity-id'

        expect(relationsUnconnected(graph)).toBe(false)
        expect(brokenRelationEntityReferences(graph)).toBe(true)
        expect(validateGraph(graph).noBrokenRelationEntityReferences).toBe(false)
    })
})

describe('Attributes in non N:M relations', () => {
    test('A non N:M relation without attributes should be valid', () => {
        expect(notNMRelationsWithAttributes(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noAttributesInNonNMRelations).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test('Non N:M relations cannot have attributes', () => {
        getEditableRelation().attributes = [createRelationAttribute()]

        expect(notNMRelationsWithAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noAttributesInNonNMRelations).toBe(false)
    })

    test('Ternary relations can have attributes regardless of maximum cardinalities', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation, {
            side1Cardinality: '0:1',
            side2Cardinality: '0:1',
            side3Cardinality: '0:1',
        })

        relation.attributes = [
            createRelationAttribute({
                idMx: 'ternary-attribute-1',
                name: 'nota',
                edgeId: 'ternary-attribute-edge-1',
            }),
        ]

        const diagnostics = validateGraph(graph)

        expect(notNMRelationsWithAttributes(graph)).toBe(false)
        expect(diagnostics.noAttributesInNonNMRelations).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })
})

describe('Binary relation cardinalities', () => {
    test('A standard 1:N relation should be valid', () => {
        const relation = getEditableRelation()

        relation.side1.cardinality = '0:N'
        relation.side2.cardinality = '1:1'

        const diagnostics = validateGraph(graph)

        expect(cardinalitiesNotValid(graph)).toBe(false)
        expect(diagnostics.noNotValidCardinalities).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test('A fully mandatory 1:1 relation should be valid', () => {
        const relation = getEditableRelation()

        relation.side1.cardinality = '1:1'
        relation.side2.cardinality = '1:1'

        const diagnostics = validateGraph(graph)

        expect(cardinalitiesNotValid(graph)).toBe(false)
        expect(diagnostics.noNotValidCardinalities).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test('Every relation should have valid cardinalities', () => {
        const relation = getEditableRelation()

        relation.side1.cardinality = ''
        relation.side2.cardinality = ''

        expect(cardinalitiesNotValid(graph)).toBe(true)
        expect(validateGraph(graph).noNotValidCardinalities).toBe(false)
    })
})

describe('Ternary relation connectivity and references', () => {
    test('A ternary relation with three configured distinct entities and valid cardinalities should be valid', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation)

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

    test('A ternary relation with an unconfigured entity side should be unconnected', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation, {
            side3EntityId: '',
        })

        const diagnostics = validateGraph(graph)

        expect(relationsUnconnected(graph)).toBe(true)
        expect(diagnostics.noUnconnectedRelations).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('A ternary relation should reference existing entities on all sides', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation, {
            side3EntityId: 'non-existing-entity-id',
        })

        const diagnostics = validateGraph(graph)

        expect(relationsUnconnected(graph)).toBe(false)
        expect(brokenRelationEntityReferences(graph)).toBe(true)
        expect(diagnostics.noBrokenRelationEntityReferences).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('A ternary relation should have valid cardinalities on all sides', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation, {
            side3Cardinality: 'X:X',
        })

        const diagnostics = validateGraph(graph)

        expect(cardinalitiesNotValid(graph)).toBe(true)
        expect(diagnostics.noNotValidCardinalities).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })
})

describe('Ternary relation repeated participants', () => {
    test('A ternary relation can repeat a participating entity when repeated roles are distinct', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation, {
            side2EntityId: '2',
            side1Role: 'tenista local',
            side2Role: 'tenista visitante',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithAmbiguousRepeatedParticipants(graph)).toBe(false)
        expect(diagnostics.noTernaryRelationsWithAmbiguousRepeatedParticipants).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test('A ternary relation with repeated participants requires roles on repeated sides', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation, {
            side2EntityId: '2',
            side1Role: 'tenista local',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithAmbiguousRepeatedParticipants(graph)).toBe(true)
        expect(diagnostics.noTernaryRelationsWithAmbiguousRepeatedParticipants).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('A ternary relation with repeated participants requires distinct repeated roles', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation, {
            side2EntityId: '2',
            side1Role: 'tenista',
            side2Role: 'tenista',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithAmbiguousRepeatedParticipants(graph)).toBe(true)
        expect(diagnostics.noTernaryRelationsWithAmbiguousRepeatedParticipants).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('A ternary relation with the same entity on all sides is invalid without distinct roles', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation, {
            side2EntityId: '2',
            side3EntityId: '2',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithAmbiguousRepeatedParticipants(graph)).toBe(true)
        expect(diagnostics.noTernaryRelationsWithAmbiguousRepeatedParticipants).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })
})

describe('Ternary relation restrictions', () => {
    test('A ternary relation cannot be identifying', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation)
        relation.isIdentifying = true

        const diagnostics = validateGraph(graph)

        expect(identifyingTernaryRelations(graph)).toBe(true)
        expect(diagnostics.noIdentifyingTernaryRelations).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('A ternary relation cannot use mandatory minimum cardinalities', () => {
        const relation = getEditableRelation()

        configureTernaryRelation(relation, {
            side2Cardinality: '1:N',
        })

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithMandatoryCardinalities(graph)).toBe(true)
        expect(diagnostics.noTernaryRelationsWithMandatoryCardinalities).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('Binary relations can still use mandatory minimum cardinalities', () => {
        const relation = getEditableRelation()

        relation.side1.cardinality = '1:N'
        relation.side2.cardinality = '1:1'

        const diagnostics = validateGraph(graph)

        expect(ternaryRelationsWithMandatoryCardinalities(graph)).toBe(false)
        expect(diagnostics.noTernaryRelationsWithMandatoryCardinalities).toBe(true)
    })
})