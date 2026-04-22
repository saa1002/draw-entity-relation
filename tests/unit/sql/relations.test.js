import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    filterTables,
    process1NRelation,
    process11Relation,
} from '../../../src/utils/sql'

let oneNGraph
let oneOneGraph

beforeEach(() => {
    oneNGraph = loadGraphFixture('1-n-relation.json')
    oneOneGraph = loadGraphFixture('1-1-relation.json')
})

describe("Extract table 1:N relation", () => {
    test("1:N relation", () => {
        const filteredTables = filterTables(oneNGraph)
        const tables = process1NRelation(filteredTables.at(0))
        expect(tables.length).toBe(2)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(2)
        expect(tables.at(1).attributes.at(0).name).toBe("Atributo")
        expect(tables.at(1).attributes.at(1).name).toBe("Atributo_Relación")
        expect(tables.at(1).attributes.at(1).notnull).toBe(false)
    })

    test("1:N relation with 1 side and min cardinality of 1", () => {
        oneNGraph.relations.at(0).side1.cardinality = "1:1"
        const filteredTables = filterTables(oneNGraph)
        const tables = process1NRelation(filteredTables.at(0))
        expect(tables.length).toBe(2)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(2)
        expect(tables.at(1).attributes.at(0).name).toBe("Atributo")
        expect(tables.at(1).attributes.at(1).name).toBe("Atributo_Relación")
        expect(tables.at(1).attributes.at(1).notnull).toBe(true)
    })
})

describe("Extract table 1:1 relation", () => {
    test("1:1 relation, 0:1-1:1", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "0:1"
        const filteredTables = filterTables(oneOneGraph)
        const tables = process11Relation(filteredTables.at(0))
        expect(tables.length).toBe(2)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(2)
        expect(tables.at(0).attributes.at(0).name).toBe("Atributo")
        expect(tables.at(1).attributes.at(1).name).toBe("Atributo_Relación")
        expect(tables.at(1).attributes.at(1).notnull).toBe(true)
        expect(tables.at(1).attributes.at(1).unique).toBe(true)
    })

    test("1:1 relation, 0:1-0:1", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "0:1"
        oneOneGraph.relations.at(0).side2.cardinality = "0:1"
        const filteredTables = filterTables(oneOneGraph)
        const tables = process11Relation(filteredTables.at(0))
        expect(tables.length).toBe(2)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(2)
        expect(tables.at(0).attributes.at(0).name).toBe("Atributo")
        expect(tables.at(1).attributes.at(1).name).toBe("Atributo_Relación")
        expect(tables.at(1).attributes.at(1).notnull).toBe(false)
        expect(tables.at(1).attributes.at(1).unique).toBe(true)
    })
})