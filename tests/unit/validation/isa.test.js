import { beforeEach, describe, expect, test } from 'vitest'
import { createIsaHierarchy } from '../../helpers/diagramBuilders'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { createEmptyIsaLink, createIsaData } from '../../../src/domain/er/isa'
import {
    brokenIsaEntityReferences,
    entitiesWithMoreThanOnePK,
    entitiesWithoutPK,
    entitiesWithoutAttributes,
    isaHierarchiesUnconnected,
    isaHierarchiesWithGeneralizationAsSpecialization,
    isaHierarchiesWithRepeatedSpecializations,
    isaSpecializationsInMultipleHierarchies,
    isaSpecializationsWithPrimaryKey,
    validateGraph,
} from '../../../src/domain/er/validation'

let graph

const removePrimaryKeys = (entity) => {
    entity.attributes.forEach((attribute) => {
        attribute.key = false
    })
}

const addValidIsa = ({
    generalizationId = '2',
    specializationIds = ['3', '19'],
} = {}) => {
    graph.isas = [
        createIsaHierarchy({
            idMx: 'isa-1',
            generalization: generalizationId,
            specializations: specializationIds,
        }),
    ]
}

beforeEach(() => {
    graph = loadGraphFixture('example.json')
    graph.isas = []
})

describe('ISA hierarchy connectivity', () => {
    test('a configured ISA hierarchy with specialization entities without own primary key should be valid', () => {
        removePrimaryKeys(graph.entities.at(1))
        removePrimaryKeys(graph.entities.at(2))
        addValidIsa()

        const diagnostics = validateGraph(graph)

        expect(isaHierarchiesUnconnected(graph)).toBe(false)
        expect(brokenIsaEntityReferences(graph)).toBe(false)
        expect(isaHierarchiesWithRepeatedSpecializations(graph)).toBe(false)
        expect(isaHierarchiesWithGeneralizationAsSpecialization(graph)).toBe(
            false,
        )
        expect(isaSpecializationsInMultipleHierarchies(graph)).toBe(false)
        expect(isaSpecializationsWithPrimaryKey(graph)).toBe(false)
        expect(entitiesWithoutPK(graph)).toBe(false)
        expect(entitiesWithMoreThanOnePK(graph)).toBe(false)
        expect(diagnostics.noUnconnectedIsas).toBe(true)
        expect(diagnostics.noBrokenIsaEntityReferences).toBe(true)
        expect(diagnostics.noIsaSpecializationsInMultipleHierarchies).toBe(true)
        expect(diagnostics.noIsaSpecializationsWithPrimaryKey).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test('an ISA hierarchy must have one generalization link', () => {
        graph.isas = [
            createIsaData({
                idMx: 'isa-1',
                specializations: [
                    createEmptyIsaLink({
                        entityId: '3',
                        edgeId: 'edge-specialization-1',
                    }),
                ],
            }),
        ]

        const diagnostics = validateGraph(graph)

        expect(isaHierarchiesUnconnected(graph)).toBe(true)
        expect(diagnostics.noUnconnectedIsas).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('an ISA hierarchy must have at least one specialization link', () => {
        graph.isas = [
            createIsaData({
                idMx: 'isa-1',
                generalization: createEmptyIsaLink({
                    entityId: '2',
                    edgeId: 'edge-generalization',
                }),
            }),
        ]

        const diagnostics = validateGraph(graph)

        expect(isaHierarchiesUnconnected(graph)).toBe(true)
        expect(diagnostics.noUnconnectedIsas).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })
})

describe('ISA entity references', () => {
    test('an ISA hierarchy must reference existing entities', () => {
        removePrimaryKeys(graph.entities.at(1))
        addValidIsa({ specializationIds: ['3', 'missing-entity'] })

        const diagnostics = validateGraph(graph)

        expect(isaHierarchiesUnconnected(graph)).toBe(false)
        expect(brokenIsaEntityReferences(graph)).toBe(true)
        expect(diagnostics.noBrokenIsaEntityReferences).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })
})

describe('ISA specialization constraints', () => {
    test('an ISA hierarchy cannot repeat the same specialization', () => {
        removePrimaryKeys(graph.entities.at(1))
        addValidIsa({ specializationIds: ['3', '3'] })

        const diagnostics = validateGraph(graph)

        expect(isaHierarchiesWithRepeatedSpecializations(graph)).toBe(true)
        expect(diagnostics.noIsaHierarchiesWithRepeatedSpecializations).toBe(
            false,
        )
        expect(diagnostics.isValid).toBe(false)
    })

    test('an ISA hierarchy cannot use the generalization as a specialization', () => {
        removePrimaryKeys(graph.entities.at(1))
        addValidIsa({ generalizationId: '2', specializationIds: ['3', '2'] })

        const diagnostics = validateGraph(graph)

        expect(isaHierarchiesWithGeneralizationAsSpecialization(graph)).toBe(
            true,
        )
        expect(
            diagnostics.noIsaHierarchiesWithGeneralizationAsSpecialization,
        ).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('an ISA specialization cannot belong to more than one ISA hierarchy', () => {
        removePrimaryKeys(graph.entities.at(1))

        graph.isas = [
            createIsaData({
                idMx: 'isa-1',
                generalization: createEmptyIsaLink({
                    entityId: '2',
                    edgeId: 'edge-generalization-1',
                }),
                specializations: [
                    createEmptyIsaLink({
                        entityId: '3',
                        edgeId: 'edge-specialization-1',
                    }),
                ],
            }),
            createIsaData({
                idMx: 'isa-2',
                generalization: createEmptyIsaLink({
                    entityId: '19',
                    edgeId: 'edge-generalization-2',
                }),
                specializations: [
                    createEmptyIsaLink({
                        entityId: '3',
                        edgeId: 'edge-specialization-2',
                    }),
                ],
            }),
        ]

        const diagnostics = validateGraph(graph)

        expect(isaSpecializationsInMultipleHierarchies(graph)).toBe(true)
        expect(diagnostics.noIsaSpecializationsInMultipleHierarchies).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })
})

describe('ISA specialization primary keys and attributes', () => {
    test('ISA specializations cannot define their own primary key', () => {
        addValidIsa()

        const diagnostics = validateGraph(graph)

        expect(isaSpecializationsWithPrimaryKey(graph)).toBe(true)
        expect(diagnostics.noIsaSpecializationsWithPrimaryKey).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('ISA specializations without own attributes should not be rejected as entities without attributes', () => {
        graph.entities.at(1).attributes = []

        addValidIsa({ specializationIds: ['3'] })

        const diagnostics = validateGraph(graph)

        expect(entitiesWithoutAttributes(graph)).toBe(false)
        expect(diagnostics.noEntitiesWithoutAttributes).toBe(true)
        expect(diagnostics.noEntitiesWithoutPK).toBe(true)
        expect(diagnostics.noIsaSpecializationsWithPrimaryKey).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })
})