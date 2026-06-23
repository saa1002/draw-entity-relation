import { describe, expect, test } from 'vitest'
import {
    createEmptyIsaLink,
    createIsaData,
    findIsaById,
    findIsaIndexById,
    getIsaEntityIds,
    getIsaGeneralizationEntityId,
    getIsaSpecializationEntityIds,
    isaHasGeneralization,
    isaHasSpecializations,
    isaInvolvesEntity,
    isIsaConfigured,
} from '../../../src/domain/er/isa'

const createConfiguredIsa = ({
    idMx = 'isa-1',
    generalizationEntityId = 'entity-parent',
    generalizationEdgeId = 'edge-parent',
    specializationEntityIds = ['entity-child-1', 'entity-child-2'],
} = {}) =>
    createIsaData({
        idMx,
        generalization: createEmptyIsaLink({
            entityId: generalizationEntityId,
            edgeId: generalizationEdgeId,
        }),
        specializations: specializationEntityIds.map(
            (specializationEntityId, index) =>
                createEmptyIsaLink({
                    entityId: specializationEntityId,
                    edgeId: `edge-child-${index + 1}`,
                }),
        ),
    })

describe('ISA link and data creation', () => {
    test('create empty ISA links with an entity reference placeholder', () => {
        expect(createEmptyIsaLink()).toEqual({
            edgeId: '',
            entity: { idMx: '' },
        })
    })

    test('create ISA data with one generalization link and specialization links', () => {
        const isa = createConfiguredIsa()

        expect(isa).toMatchObject({
            idMx: 'isa-1',
            position: { x: 0, y: 0 },
            generalization: {
                edgeId: 'edge-parent',
                entity: { idMx: 'entity-parent' },
            },
        })
        expect(isa.specializations).toHaveLength(2)
    })

    test('create ISA data with an empty specialization collection when input is not an array', () => {
        const isa = createIsaData({
            idMx: 'isa-1',
            specializations: null,
        })

        expect(isa.specializations).toEqual([])
    })
})

describe('ISA lookup helpers', () => {
    test('find ISA hierarchies by mxGraph id', () => {
        const diagram = {
            isas: [
                createIsaData({ idMx: 'isa-empty' }),
                createConfiguredIsa({ idMx: 'isa-configured' }),
            ],
        }

        expect(findIsaById(diagram, 'isa-configured')?.idMx).toBe(
            'isa-configured',
        )
        expect(findIsaIndexById(diagram, 'isa-configured')).toBe(1)
        expect(findIsaById(diagram, 'missing')).toBeNull()
        expect(findIsaIndexById(diagram, 'missing')).toBe(-1)
    })

    test('missing ISA collections should behave as empty collections', () => {
        const diagram = {}

        expect(findIsaById(diagram, 'isa-1')).toBeNull()
        expect(findIsaIndexById(diagram, 'isa-1')).toBe(-1)
    })
})

describe('ISA entity reference helpers', () => {
    test('list generalization and specialization entity ids', () => {
        const isa = createConfiguredIsa()

        expect(getIsaGeneralizationEntityId(isa)).toBe('entity-parent')
        expect(getIsaSpecializationEntityIds(isa)).toEqual([
            'entity-child-1',
            'entity-child-2',
        ])
        expect(getIsaEntityIds(isa)).toEqual([
            'entity-parent',
            'entity-child-1',
            'entity-child-2',
        ])
    })

    test('ignore empty entity ids when listing ISA entity ids', () => {
        const isa = createIsaData({
            generalization: createEmptyIsaLink({
                entityId: '',
                edgeId: 'edge-parent',
            }),
            specializations: [
                createEmptyIsaLink({
                    entityId: 'entity-child',
                    edgeId: 'edge-child',
                }),
                createEmptyIsaLink({
                    entityId: '',
                    edgeId: 'edge-empty-child',
                }),
            ],
        })

        expect(getIsaEntityIds(isa)).toEqual(['entity-child'])
    })

    test('detect entity participation in an ISA hierarchy', () => {
        const isa = createConfiguredIsa()

        expect(isaInvolvesEntity(isa, 'entity-parent')).toBe(true)
        expect(isaInvolvesEntity(isa, 'entity-child-2')).toBe(true)
        expect(isaInvolvesEntity(isa, 'entity-other')).toBe(false)
        expect(isaInvolvesEntity(isa, '')).toBe(false)
    })
})

describe('ISA configuration helpers', () => {
    test('detect configured ISA hierarchies', () => {
        const isa = createConfiguredIsa()

        expect(isaHasGeneralization(isa)).toBe(true)
        expect(isaHasSpecializations(isa)).toBe(true)
        expect(isIsaConfigured(isa)).toBe(true)
    })

    test('ISA hierarchies without generalization should be incomplete', () => {
        const isa = createIsaData({
            specializations: [
                createEmptyIsaLink({
                    entityId: 'entity-child',
                    edgeId: 'edge-child',
                }),
            ],
        })

        expect(isaHasGeneralization(isa)).toBe(false)
        expect(isaHasSpecializations(isa)).toBe(true)
        expect(isIsaConfigured(isa)).toBe(false)
    })

    test('ISA hierarchies without specializations should be incomplete', () => {
        const isa = createIsaData({
            generalization: createEmptyIsaLink({
                entityId: 'entity-parent',
                edgeId: 'edge-parent',
            }),
        })

        expect(isaHasGeneralization(isa)).toBe(true)
        expect(isaHasSpecializations(isa)).toBe(false)
        expect(isIsaConfigured(isa)).toBe(false)
    })

    test('ISA hierarchies without required edge ids should be incomplete', () => {
        const isaWithoutGeneralizationEdge = createConfiguredIsa({
            generalizationEdgeId: '',
        })

        const isaWithoutSpecializationEdge = createIsaData({
            generalization: createEmptyIsaLink({
                entityId: 'entity-parent',
                edgeId: 'edge-parent',
            }),
            specializations: [
                createEmptyIsaLink({
                    entityId: 'entity-child',
                    edgeId: '',
                }),
            ],
        })

        expect(isIsaConfigured(isaWithoutGeneralizationEdge)).toBe(false)
        expect(isIsaConfigured(isaWithoutSpecializationEdge)).toBe(false)
    })
})