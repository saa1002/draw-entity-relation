import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    repeatedAttributesInEntity,
    nmRelationsWithPK,
    sqlIdentifierCollisions,
    validateGraph,
} from '../../../src/domain/er/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})
describe("Attribute name uniqueness", () => {
    test("Entities with unique attribute names should be valid", () => {
        expect(repeatedAttributesInEntity(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noRepeatedAttrNames).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test("Entities can't have repeated attributes names", () => {
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
})

describe("N:M relation attribute constraints", ()=> {
    test("An N:M relation without primary key attributes should be valid", () => {
        expect(nmRelationsWithPK(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noNMRelationsWithPK).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test("N:M relations can't have primary key attributes", () => {
        expect(nmRelationsWithPK(graph)).toBe(false);

        graph.relations.at(0).attributes.at(0).key = true;

        expect(nmRelationsWithPK(graph)).toBe(true);
        expect(validateGraph(graph).noNMRelationsWithPK).toBe(false);
    })

})

describe("SQL identifier normalization", () => {
    test("Attributes normalized for SQL should not collide", () => {
        expect(sqlIdentifierCollisions(graph)).toBe(false)

        graph.entities.at(0).attributes.at(0).name = "código"
        graph.entities.at(0).attributes.at(1).name = "codigo"

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })
    
    test("Composite attribute projections that normalize to the same SQL column should be invalid", () => {
        graph.entities.at(0).attributes = [
            {
                idMx: "attr-1",
                name: "direccion",
                key: false,
                partialKey: false,
                children: [
                    {
                        idMx: "attr-2",
                        name: "código",
                        key: false,
                        partialKey: false,
                    },
                ],
            },
            {
                idMx: "attr-3",
                name: "direccion_codigo",
                key: true,
                partialKey: false,
            },
        ];

        expect(sqlIdentifierCollisions(graph)).toBe(true);
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false);
    });
})