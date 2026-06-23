import { beforeEach, describe, expect, test } from 'vitest'
import { createAttribute } from '../../helpers/diagramBuilders'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    repeatedEntities,
    entitiesWithoutAttributes,
    entitiesWithoutPK,
    entitiesWithMoreThanOnePK,
    validateGraph,
} from '../../../src/domain/er/validation'

let graph

const removePrimaryKeys = (entity) => {
    entity.attributes.forEach((attribute) => {
        attribute.key = false
    })
}

const createCompositeAttributeWithKey = ({
    idMx = 'attr-composite',
    name = 'identificador',
    keyIdMx = 'attr-nested-key',
    keyName = 'codigo',
} = {}) =>
    createAttribute({
        idMx,
        name,
        children: [
            createAttribute({
                idMx: keyIdMx,
                name: keyName,
                key: true,
            }),
        ],
    })

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe('Entity and N:M relation name uniqueness', () => {
    test('Entities and N:M relations with unique names should be valid', () => {
        expect(repeatedEntities(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noRepeatedNames).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test("Entities can't have repeated names", () => {
        graph.entities.at(1).name = graph.entities.at(0).name

        expect(repeatedEntities(graph)).toBe(true)
        expect(validateGraph(graph).noRepeatedNames).toBe(false)
    })

    test("N:M relations and entities can't have repeated names", () => {
        graph.relations.at(0).name = graph.entities.at(0).name

        expect(repeatedEntities(graph)).toBe(true)
        expect(validateGraph(graph).noRepeatedNames).toBe(false)
    })
})

describe('Entity attribute presence', () => {
    test('Entities with at least one attribute should be valid', () => {
        expect(entitiesWithoutAttributes(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noEntitiesWithoutAttributes).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test('Entities must have at least one attribute', () => {
        graph.entities.at(0).attributes = []

        expect(entitiesWithoutAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noEntitiesWithoutAttributes).toBe(false)
    })
})

describe('Strong entity primary key constraints', () => {
    test('A strong entity with exactly one primary key should be valid', () => {
        expect(entitiesWithoutPK(graph)).toBe(false)
        expect(entitiesWithMoreThanOnePK(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noEntitiesWithoutPK).toBe(true)
        expect(diagnostics.noEntitiesWithMoreThanOnePK).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test('A strong entity without primary key should be invalid', () => {
        removePrimaryKeys(graph.entities.at(0))

        expect(entitiesWithoutPK(graph)).toBe(true)
        expect(validateGraph(graph).noEntitiesWithoutPK).toBe(false)
    })

    test('A strong entity with more than one primary key should be invalid', () => {
        graph.entities.at(0).attributes.at(1).key = true

        expect(entitiesWithMoreThanOnePK(graph)).toBe(true)
        expect(validateGraph(graph).noEntitiesWithMoreThanOnePK).toBe(false)
    })

    test('A strong entity with a nested primary key should pass primary key presence validation', () => {
        graph.entities.at(0).attributes = [createCompositeAttributeWithKey()]

        expect(entitiesWithoutPK(graph)).toBe(false)
        expect(validateGraph(graph).noEntitiesWithoutPK).toBe(true)
    })

    test('A nested primary key should count toward primary key uniqueness validation', () => {
        graph.entities.at(0).attributes.push(
            createCompositeAttributeWithKey({
                idMx: 'attr-composite',
                name: 'datos',
            }),
        )

        expect(entitiesWithMoreThanOnePK(graph)).toBe(true)
        expect(validateGraph(graph).noEntitiesWithMoreThanOnePK).toBe(false)
    })
})