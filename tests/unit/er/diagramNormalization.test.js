import { describe, expect, test } from 'vitest'
import {
    normalizeAttribute,
    normalizeDiagramData,
    normalizeIsa,
    normalizeRelation,
    normalizeRelationAttribute,
} from '../../../src/domain/er/diagramNormalization'
import { RELATION_ARITIES } from '../../../src/domain/er/relations'

const createRawRelationSide = ({
    idMx = 'side-1',
    entityId = 'entity-1',
    cardinality = '1:1',
    role = '',
    cell = idMx,
    edgeId = `edge-${idMx}`,
} = {}) => ({
    idMx,
    cardinality,
    role,
    cell,
    edgeId,
    entity: { idMx: entityId },
})

const createRawBinaryRelation = ({
    idMx = 'relation-1',
    name = 'Works',
    side1 = createRawRelationSide({
        idMx: 'side-1',
        entityId: 'entity-1',
    }),
    side2 = createRawRelationSide({
        idMx: 'side-2',
        entityId: 'entity-2',
    }),
    side3,
    arity,
} = {}) => ({
    idMx,
    name,
    ...(arity !== undefined ? { arity } : {}),
    side1,
    side2,
    ...(side3 ? { side3 } : {}),
})

const createRawTernaryRelation = ({
    idMx = 'relation-1',
    name = 'Supplies',
    side1 = createRawRelationSide({
        idMx: 'side-1',
        entityId: 'entity-1',
    }),
    side2 = createRawRelationSide({
        idMx: 'side-2',
        entityId: 'entity-2',
    }),
    side3 = createRawRelationSide({
        idMx: 'side-3',
        entityId: 'entity-3',
    }),
} = {}) =>
    createRawBinaryRelation({
        idMx,
        name,
        arity: RELATION_ARITIES.TERNARY,
        side1,
        side2,
        side3,
    })

const expectNestedAttributeNormalization = (attribute) => {
    expect(attribute.children[0]).toMatchObject({
        idMx: 'attr-2',
        name: 'location',
        key: false,
        partialKey: false,
        multivalued: true,
    })

    expect(attribute.children[0].children[0]).toMatchObject({
        idMx: 'attr-3',
        name: 'city',
        key: false,
        partialKey: false,
    })
}

describe('Attribute normalization', () => {
    test('flat entity attributes should remain leaf attributes', () => {
        const attribute = normalizeAttribute({
            idMx: 'attr-1',
            name: 'name',
        })

        expect(attribute).toMatchObject({
            idMx: 'attr-1',
            name: 'name',
            key: false,
            partialKey: false,
            position: { x: 0, y: 0 },
            cell: ['attr-1', null],
            offsetX: 0,
            offsetY: 0,
        })
        expect(attribute).not.toHaveProperty('children')
    })

    test('entity attributes should preserve multivalued flags', () => {
        const attribute = normalizeAttribute({
            idMx: 'attr-1',
            name: 'phones',
            multivalued: true,
        })

        expect(attribute).toMatchObject({
            idMx: 'attr-1',
            name: 'phones',
            multivalued: true,
        })
        expect(attribute).not.toHaveProperty('children')
    })

    test('relation attributes should preserve multivalued flags', () => {
        const attribute = normalizeRelationAttribute({
            idMx: 'attr-1',
            name: 'phones',
            multivalued: true,
        })

        expect(attribute).toMatchObject({
            idMx: 'attr-1',
            name: 'phones',
            multivalued: true,
        })
        expect(attribute).not.toHaveProperty('children')
    })

    test('entity attributes should normalize children recursively', () => {
        const attribute = normalizeAttribute({
            idMx: 'attr-1',
            name: 'address',
            children: [
                {
                    idMx: 'attr-2',
                    name: 'location',
                    multivalued: true,
                    children: [
                        {
                            idMx: 'attr-3',
                            name: 'city',
                        },
                    ],
                },
            ],
        })

        expectNestedAttributeNormalization(attribute)
    })

    test('relation attributes should normalize children recursively', () => {
        const attribute = normalizeRelationAttribute({
            idMx: 'attr-1',
            name: 'address',
            children: [
                {
                    idMx: 'attr-2',
                    name: 'location',
                    multivalued: true,
                    children: [
                        {
                            idMx: 'attr-3',
                            name: 'city',
                        },
                    ],
                },
            ],
        })

        expectNestedAttributeNormalization(attribute)
    })
})

describe('Relation normalization', () => {
    test('keeps binary relations backward compatible without explicit arity', () => {
        const relation = normalizeRelation(
            createRawBinaryRelation({
                side3: createRawRelationSide({
                    idMx: 'side-3',
                    entityId: 'entity-3',
                }),
            }),
        )

        expect(relation).not.toHaveProperty('arity')
        expect(relation).not.toHaveProperty('side3')
        expect(relation.side1.entity.idMx).toBe('entity-1')
        expect(relation.side2.entity.idMx).toBe('entity-2')
    })

    test('normalizes ternary relations with explicit third side', () => {
        const relation = normalizeRelation(createRawTernaryRelation())

        expect(relation.arity).toBe(RELATION_ARITIES.TERNARY)
        expect(relation.side1.entity.idMx).toBe('entity-1')
        expect(relation.side2.entity.idMx).toBe('entity-2')
        expect(relation.side3.entity.idMx).toBe('entity-3')
    })

    test('normalizes optional relation side roles', () => {
        const relation = normalizeRelation(
            createRawTernaryRelation({
                name: 'Plays',
                side1: createRawRelationSide({
                    idMx: 'side-1',
                    entityId: 'entity-player',
                    role: 'local player',
                }),
                side2: createRawRelationSide({
                    idMx: 'side-2',
                    entityId: 'entity-player',
                    role: '  away player  ',
                }),
                side3: createRawRelationSide({
                    idMx: 'side-3',
                    entityId: 'entity-date',
                }),
            }),
        )

        expect(relation.side1.role).toBe('local player')
        expect(relation.side2.role).toBe('away player')
        expect(relation.side3.role).toBe('')
    })

    test('falls back to binary relation shape for unsupported arities', () => {
        const relation = normalizeRelation(
            createRawBinaryRelation({
                name: 'InvalidArity',
                arity: 4,
                side3: createRawRelationSide({
                    idMx: 'side-3',
                    entityId: 'entity-3',
                }),
            }),
        )

        expect(relation).not.toHaveProperty('arity')
        expect(relation).not.toHaveProperty('side3')
        expect(relation.side1.entity.idMx).toBe('entity-1')
        expect(relation.side2.entity.idMx).toBe('entity-2')
    })
})

describe('ISA normalization', () => {
    test('normalizes missing ISA collections as an empty array', () => {
        expect(
            normalizeDiagramData({
                entities: [],
                relations: [],
            }),
        ).toEqual({
            entities: [],
            relations: [],
            isas: [],
        })
    })

    test('normalizes ISA links and position', () => {
        const isa = normalizeIsa({
            idMx: 'isa-1',
            generalization: {
                edgeId: 'edge-parent',
                entity: { idMx: 'entity-parent' },
            },
            specializations: [
                {
                    edgeId: 'edge-child',
                    entity: { idMx: 'entity-child' },
                },
            ],
        })

        expect(isa).toMatchObject({
            idMx: 'isa-1',
            position: { x: 0, y: 0 },
            generalization: {
                edgeId: 'edge-parent',
                entity: { idMx: 'entity-parent' },
            },
            specializations: [
                {
                    edgeId: 'edge-child',
                    entity: { idMx: 'entity-child' },
                },
            ],
        })
    })
})