import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    repeatedAttributesInEntity,
    nmRelationsWithPK,
    sqlIdentifierCollisions,
    validateGraph,
} from '../../../src/utils/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe("Non repeated attributes in entities or n:m relations", ()=> {
    test("entities can't have repeated attributes names", () => {
        expect(repeatedAttributesInEntity(graph)).toBe(false);
        // Set an attribute in an entity to the same name of other
        graph.entities.at(0).attributes.at(1).name = graph.entities.at(0).attributes.at(0).name
        expect(repeatedAttributesInEntity(graph)).toBe(true);
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(false)
    })

    test("N:M relations can't have repeated attributes names", () => {
        // Test the graph without repeated attributes
        expect(repeatedAttributesInEntity(graph)).toBe(false);
        // Set an attribute in an N:M relation to the same name of other
        graph.relations.at(0).attributes.at(1).name = graph.relations.at(0).attributes.at(0).name
        expect(repeatedAttributesInEntity(graph)).toBe(true);
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(false)
    })

    test("attributes normalized for SQL should not collide", () => {
        expect(sqlIdentifierCollisions(graph)).toBe(false)

        graph.entities.at(0).attributes.at(0).name = "código"
        graph.entities.at(0).attributes.at(1).name = "codigo"

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })
    
    test("N:M relations can't have primary key attributes", () => {
        expect(nmRelationsWithPK(graph)).toBe(false);

        graph.relations.at(0).attributes.at(0).key = true;

        expect(nmRelationsWithPK(graph)).toBe(true);
        expect(validateGraph(graph).noNMRelationsWithPK).toBe(false);
    })

    test("an N:M relation without primary key attributes should be valid", () => {
        expect(nmRelationsWithPK(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noNMRelationsWithPK).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })
})