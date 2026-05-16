import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { validateGraph, sqlIdentifierCollisions } from '../../../src/domain/er/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

test("Empty graph should be invalid", () => {
        
    const emptyGraph = {
        entities: [],
        relations: [],
    }

    const diagnostics = validateGraph(emptyGraph)

    expect(diagnostics.notEmpty).toBe(false)
    expect(diagnostics.isValid).toBe(false)
})

test("A valid graph should pass validation", () => {
    expect(validateGraph(graph).isValid).toBe(true)
})
    
test("Normalized SQL identifiers should not collide", () => {
    expect(sqlIdentifierCollisions(graph)).toBe(false)

    graph.entities.at(0).name = "País"
    graph.entities.at(1).name = "Pais"

    expect(sqlIdentifierCollisions(graph)).toBe(true)
    expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
})