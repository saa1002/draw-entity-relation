import { describe, expect, test } from 'vitest'
import {
    createAttribute,
    createBinaryRelation,
    createDiagram,
    createIdentifyingRelation,
    createRelationSide,
    createStrongEntity,
    createWeakEntity,
} from '../../helpers/diagramBuilders'
import {
    entitiesWithoutPK,
    identifyingRelationCardinalitiesNotValid,
    identifyingRelationsNotValid,
    inconsistentWeakEntityOwnership,
    multipleIdentifyingRelationsPerWeakEntity,
    strongEntitiesWithPartialKey,
    validateGraph,
    weakEntitiesWithMoreThanOnePartialKey,
    weakEntitiesWithPrimaryKey,
    weakEntitiesWithoutIdentifyingRelation,
    weakEntitiesWithoutPartialKey,
} from '../../../src/domain/er/validation'

const createRegularAttribute = ({
    idMx = 'attr-name',
    name = 'nombre',
} = {}) =>
    createAttribute({
        idMx,
        name,
    })

const createPrimaryKeyAttribute = ({
    idMx = 'attr-id',
    name = 'id',
} = {}) =>
    createAttribute({
        idMx,
        name,
        key: true,
    })

const createPartialKeyAttribute = ({
    idMx = 'attr-number',
    name = 'numero',
} = {}) =>
    createAttribute({
        idMx,
        name,
        partialKey: true,
    })

const createCompositeAttribute = ({
    idMx = 'attr-composite',
    name = 'codigo',
    children = [],
} = {}) =>
    createAttribute({
        idMx,
        name,
        children,
    })

const createWeakEntityValidationScenario = ({
    weakAttributes = [createPartialKeyAttribute()],
    ownerAttributes = [createPrimaryKeyAttribute()],
    weakIdentifyingRelationId = 'relation-identifying',
    weakOwnerEntityId = 'entity-owner',
    relationId = 'relation-identifying',
    relationIsIdentifying = true,
    weakCardinality = '0:N',
    ownerCardinality = '1:1',
    extraEntities = [],
    extraRelations = [],
} = {}) => {
    const weakEntity = createWeakEntity({
        idMx: 'entity-weak',
        name: 'LineaPedido',
        ownerEntityId: weakOwnerEntityId,
        identifyingRelationId: weakIdentifyingRelationId,
        attributes: weakAttributes,
    })

    const ownerEntity = createStrongEntity({
        idMx: 'entity-owner',
        name: 'Pedido',
        attributes: ownerAttributes,
    })

    const relation = createIdentifyingRelation({
        idMx: relationId,
        name: 'Tiene',
        weakEntity,
        ownerEntity,
        weakCardinality,
        ownerCardinality,
        weakSideId: 'side-weak',
        ownerSideId: 'side-owner',
    })

    relation.isIdentifying = relationIsIdentifying

    return {
        graph: createDiagram({
            entities: [weakEntity, ownerEntity, ...extraEntities],
            relations: [relation, ...extraRelations],
        }),
        weakEntity,
        ownerEntity,
        relation,
    }
}

const createIdentifyingRelationForWeakEntity = ({
    idMx,
    name,
    weakEntity,
    ownerEntity,
}) =>
    createIdentifyingRelation({
        idMx,
        name,
        weakEntity,
        ownerEntity,
        weakSideId: `${idMx}-weak-side`,
        ownerSideId: `${idMx}-owner-side`,
    })

const createStrongEntityValidationGraph = ({ attributes }) =>
    createDiagram({
        entities: [
            createStrongEntity({
                idMx: 'entity-strong',
                name: 'Pedido',
                attributes,
            }),
        ],
    })

describe('Partial keys', () => {
    test('A weak entity with one partial key should pass partial key presence validation', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [createPartialKeyAttribute()],
        })

        expect(weakEntitiesWithoutPartialKey(graph)).toBe(false)
        expect(weakEntitiesWithPrimaryKey(graph)).toBe(false)
        expect(validateGraph(graph).noWeakEntitiesWithoutPartialKey).toBe(true)
    })

    test('A weak entity must have at least one partial key', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [createRegularAttribute()],
        })

        expect(weakEntitiesWithoutPartialKey(graph)).toBe(true)
        expect(validateGraph(graph).noWeakEntitiesWithoutPartialKey).toBe(false)
    })

    test('A weak entity with a single partial key should pass partial key uniqueness validation', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [createPartialKeyAttribute()],
        })

        expect(weakEntitiesWithMoreThanOnePartialKey(graph)).toBe(false)
        expect(
            validateGraph(graph).noWeakEntitiesWithMoreThanOnePartialKey,
        ).toBe(true)
    })

    test('A weak entity cannot have more than one partial key', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [
                createPartialKeyAttribute({
                    idMx: 'attr-line-number',
                    name: 'numero',
                }),
                createPartialKeyAttribute({
                    idMx: 'attr-line-version',
                    name: 'version',
                }),
            ],
        })

        expect(weakEntitiesWithMoreThanOnePartialKey(graph)).toBe(true)
        expect(
            validateGraph(graph).noWeakEntitiesWithMoreThanOnePartialKey,
        ).toBe(false)
    })

    test('A weak entity with a nested partial key should pass partial key presence validation', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [
                createCompositeAttribute({
                    children: [
                        createPartialKeyAttribute({
                            idMx: 'attr-nested-partial-key',
                            name: 'serie',
                        }),
                    ],
                }),
            ],
        })

        expect(weakEntitiesWithoutPartialKey(graph)).toBe(false)
        expect(validateGraph(graph).noWeakEntitiesWithoutPartialKey).toBe(true)
    })

    test('A nested partial key should count toward partial key uniqueness validation', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [
                createPartialKeyAttribute({
                    idMx: 'attr-top-level-partial-key',
                    name: 'numero',
                }),
                createCompositeAttribute({
                    children: [
                        createPartialKeyAttribute({
                            idMx: 'attr-nested-partial-key',
                            name: 'serie',
                        }),
                    ],
                }),
            ],
        })

        expect(weakEntitiesWithMoreThanOnePartialKey(graph)).toBe(true)
        expect(
            validateGraph(graph).noWeakEntitiesWithMoreThanOnePartialKey,
        ).toBe(false)
    })
})

describe('Partial keys in strong entities', () => {
    test('A strong entity without partial key should pass validation', () => {
        const graph = createStrongEntityValidationGraph({
            attributes: [createPrimaryKeyAttribute()],
        })

        expect(strongEntitiesWithPartialKey(graph)).toBe(false)
        expect(validateGraph(graph).noStrongEntitiesWithPartialKey).toBe(true)
    })

    test('A strong entity cannot have partial key', () => {
        const graph = createStrongEntityValidationGraph({
            attributes: [createPartialKeyAttribute()],
        })

        expect(strongEntitiesWithPartialKey(graph)).toBe(true)
        expect(validateGraph(graph).noStrongEntitiesWithPartialKey).toBe(false)
    })

    test('A strong entity cannot have a nested partial key', () => {
        const graph = createStrongEntityValidationGraph({
            attributes: [
                createCompositeAttribute({
                    children: [
                        createPartialKeyAttribute({
                            idMx: 'attr-nested-partial-key',
                            name: 'serie',
                        }),
                    ],
                }),
            ],
        })

        expect(strongEntitiesWithPartialKey(graph)).toBe(true)
        expect(validateGraph(graph).noStrongEntitiesWithPartialKey).toBe(false)
    })
})

describe('Identifying relation presence', () => {
    test('A weak entity with a valid identifying relation should pass validation', () => {
        const { graph } = createWeakEntityValidationScenario()

        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(false)
        expect(
            validateGraph(graph).noWeakEntitiesWithoutIdentifyingRelation,
        ).toBe(true)
    })

    test('A weak entity must have an identifying relation', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakIdentifyingRelationId: null,
        })

        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(true)
        expect(
            validateGraph(graph).noWeakEntitiesWithoutIdentifyingRelation,
        ).toBe(false)
    })

    test('A weak entity cannot reference a non-identifying relation', () => {
        const { graph } = createWeakEntityValidationScenario({
            relationIsIdentifying: false,
        })

        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(true)
        expect(
            validateGraph(graph).noWeakEntitiesWithoutIdentifyingRelation,
        ).toBe(false)
    })
})

describe('Identifying relation structure', () => {
    test('A valid identifying relation should pass structure diagnostics', () => {
        const { graph } = createWeakEntityValidationScenario()

        expect(identifyingRelationsNotValid(graph)).toBe(false)
        expect(validateGraph(graph).noInvalidIdentifyingRelations).toBe(true)
    })

    test('An identifying relation must connect exactly one dependent weak entity and one owner entity', () => {
        const { graph, ownerEntity, relation } =
            createWeakEntityValidationScenario()

        graph.entities.at(0).weak = false
        ownerEntity.weak = false
        relation.isIdentifying = true

        expect(identifyingRelationsNotValid(graph)).toBe(true)
        expect(validateGraph(graph).noInvalidIdentifyingRelations).toBe(false)
    })
})

describe('Identifying relation cardinalities', () => {
    test('An identifying relation with valid identifying cardinalities should pass validation', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakCardinality: '0:N',
            ownerCardinality: '1:1',
        })

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(false)
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(true)
    })

    test('An identifying relation should also allow 1:N on the weak side', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakCardinality: '1:N',
            ownerCardinality: '1:1',
        })

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(false)
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(true)
    })

    test('An identifying relation is invalid if the owner side is not 1:1', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakCardinality: '0:N',
            ownerCardinality: '0:1',
        })

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(true)
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(
            false,
        )
    })

    test('An identifying relation is invalid if the weak side is not N-based', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakCardinality: '0:1',
            ownerCardinality: '1:1',
        })

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(true)
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(
            false,
        )
    })
})

describe('Ownership consistency', () => {
    test('A weak entity with consistent owner and identifying relation should pass ownership validation', () => {
        const { graph } = createWeakEntityValidationScenario()

        expect(inconsistentWeakEntityOwnership(graph)).toBe(false)
        expect(validateGraph(graph).noInconsistentWeakEntityOwnership).toBe(true)
    })

    test('A weak entity must be connected to its identifying relation', () => {
        const unrelatedOwner = createStrongEntity({
            idMx: 'entity-unrelated-owner',
            name: 'Cliente',
            keyName: 'id_cliente',
        })
        const unrelatedRelation = createBinaryRelation({
            idMx: 'relation-unrelated',
            name: 'Compra',
            isIdentifying: true,
            side1: createRelationSide({
                idMx: 'side-unrelated-owner',
                entity: unrelatedOwner,
                cardinality: '1:1',
            }),
            side2: createRelationSide({
                idMx: 'side-owner',
                entity: 'entity-owner',
                cardinality: '0:N',
            }),
        })
        const { graph } = createWeakEntityValidationScenario({
            weakIdentifyingRelationId: 'relation-unrelated',
            extraEntities: [unrelatedOwner],
            extraRelations: [unrelatedRelation],
        })

        expect(inconsistentWeakEntityOwnership(graph)).toBe(true)
        expect(validateGraph(graph).noInconsistentWeakEntityOwnership).toBe(
            false,
        )
    })

    test('A weak entity owner must match the strong entity on the other side', () => {
        const otherOwner = createStrongEntity({
            idMx: 'entity-other-owner',
            name: 'Cliente',
            keyName: 'id_cliente',
        })
        const { graph } = createWeakEntityValidationScenario({
            weakOwnerEntityId: otherOwner.idMx,
            extraEntities: [otherOwner],
        })

        expect(inconsistentWeakEntityOwnership(graph)).toBe(true)
        expect(validateGraph(graph).noInconsistentWeakEntityOwnership).toBe(
            false,
        )
    })
})

describe('Identifying relation uniqueness', () => {
    test('A weak entity with a single identifying relationship should pass uniqueness validation', () => {
        const { graph } = createWeakEntityValidationScenario()

        expect(multipleIdentifyingRelationsPerWeakEntity(graph)).toBe(false)
        expect(
            validateGraph(graph).noMultipleIdentifyingRelationsPerWeakEntity,
        ).toBe(true)
    })

    test('A weak entity cannot participate in more than one identifying relationship', () => {
        const secondOwner = createStrongEntity({
            idMx: 'entity-second-owner',
            name: 'Cliente',
            keyName: 'id_cliente',
        })
        const { graph, weakEntity } = createWeakEntityValidationScenario({
            extraEntities: [secondOwner],
        })
        const secondIdentifyingRelation = createIdentifyingRelationForWeakEntity(
            {
                idMx: 'relation-second-identifying',
                name: 'Pertenece',
                weakEntity,
                ownerEntity: secondOwner,
            },
        )

        graph.relations.push(secondIdentifyingRelation)

        expect(multipleIdentifyingRelationsPerWeakEntity(graph)).toBe(true)
        expect(
            validateGraph(graph).noMultipleIdentifyingRelationsPerWeakEntity,
        ).toBe(false)
    })
})

describe('Regular primary keys in weak entities', () => {
    test('A weak entity without a regular primary key should pass validation', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [createPartialKeyAttribute()],
        })

        expect(weakEntitiesWithPrimaryKey(graph)).toBe(false)
        expect(validateGraph(graph).noWeakEntitiesWithPrimaryKey).toBe(true)
    })

    test('A weak entity cannot have a regular primary key', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [createPrimaryKeyAttribute()],
        })

        expect(weakEntitiesWithPrimaryKey(graph)).toBe(true)
        expect(validateGraph(graph).noWeakEntitiesWithPrimaryKey).toBe(false)
    })

    test('A weak entity cannot have a nested regular primary key', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [
                createCompositeAttribute({
                    idMx: 'attr-composite',
                    name: 'datos',
                    children: [
                        createPrimaryKeyAttribute({
                            idMx: 'attr-nested-key',
                            name: 'id',
                        }),
                    ],
                }),
            ],
        })

        expect(weakEntitiesWithPrimaryKey(graph)).toBe(true)
        expect(validateGraph(graph).noWeakEntitiesWithPrimaryKey).toBe(false)
    })
})

describe('Interaction with strong entity PK validation', () => {
    test('Weak entities should not fail strong entity primary key validation', () => {
        const { graph } = createWeakEntityValidationScenario({
            weakAttributes: [createRegularAttribute()],
        })

        expect(entitiesWithoutPK(graph)).toBe(false)
        expect(validateGraph(graph).noEntitiesWithoutPK).toBe(true)
    })
})

describe('Canonical valid configuration', () => {
    test('A canonical weak entity configuration should be valid', () => {
        const { graph } = createWeakEntityValidationScenario()
        const diagnostics = validateGraph(graph)

        expect(weakEntitiesWithoutPartialKey(graph)).toBe(false)
        expect(weakEntitiesWithMoreThanOnePartialKey(graph)).toBe(false)
        expect(weakEntitiesWithPrimaryKey(graph)).toBe(false)
        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(false)
        expect(identifyingRelationsNotValid(graph)).toBe(false)
        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(false)
        expect(inconsistentWeakEntityOwnership(graph)).toBe(false)
        expect(multipleIdentifyingRelationsPerWeakEntity(graph)).toBe(false)
        expect(diagnostics.isValid).toBe(true)
    })
})