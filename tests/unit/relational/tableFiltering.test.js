import { beforeEach, describe, expect, test } from 'vitest'
import { filterTables } from '../../../src/domain/relational/erToRelationalModel'
import { loadGraphFixture } from '../../helpers/graphLoader'

let oneNGraph
let oneOneGraph
let nMGraph
let oneNGraphAndEntity

beforeEach(() => {
    oneNGraph = loadGraphFixture('1-n-relation.json')
    oneOneGraph = loadGraphFixture('1-1-relation.json')
    nMGraph = loadGraphFixture('n-m-relation.json')
    oneNGraphAndEntity = loadGraphFixture('1-n-relation_alone-entity.json')
})

const expectSingleTableCandidate = (graph, expectedType) => {
    const tables = filterTables(graph)

    expect(tables).toHaveLength(1)
    expect(tables.at(0).type).toBe(expectedType)

    return tables.at(0)
}

describe('Table filtering', () => {
    test('should classify a 1:1 relation as a single table candidate', () => {
        expectSingleTableCandidate(oneOneGraph, '1:1')
    })

    test('should classify a 1:N relation as a single table candidate', () => {
        expectSingleTableCandidate(oneNGraph, '1:N')
    })

    test('should classify an N:M relation as a single table candidate', () => {
        expectSingleTableCandidate(nMGraph, 'N:M')
    })

    test('should preserve unconnected entities when filtering table candidates', () => {
        const tables = filterTables(oneNGraphAndEntity)

        expect(tables).toHaveLength(2)
        expect(tables.at(0).type).toBe('1:N')
        expect(tables.at(0).name).toBe('Relación')
        expect(tables.at(1).name).toBe('Entidad')
    })
})