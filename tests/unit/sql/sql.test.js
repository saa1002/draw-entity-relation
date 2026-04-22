import { beforeEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { 
    filterTables,
    process1NRelation,
    process11Relation,
    processNMRelation,
    generateSQL
} from "../../../src/utils/sql"


describe("Filter graph tables", () => {
    test("1:1 relation", () => {
        const tables = filterTables(oneOneGraph)
        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe("1:1")
    })
    test("1:N relation", () => {
        const tables = filterTables(oneNGraph)
        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe("1:N")
    })
    test("N:M relation", () => {
        const tables = filterTables(nMGraph)
        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe("N:M")
    })
    test("1:N relation and unconnected entity", () => {
        const tables = filterTables(oneNGraphAndEntity)
        expect(tables.length).toBe(2)
        expect(tables.at(0).type).toBe("1:N")
        expect(tables.at(0).name).toBe("Relación")
        expect(tables.at(1).name).toBe("Entidad")
    })
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
describe("Extract table N:M relation", () => {
    test("N:M relation", () => {
        const filteredTables = filterTables(nMGraph)
        const tables = processNMRelation(filteredTables.at(0))
        expect(tables.length).toBe(3)
        expect(tables.at(0).attributes.length).toBe(1)
        expect(tables.at(1).attributes.length).toBe(1)
        expect(tables.at(2).attributes.length).toBe(3)

        expect(tables.at(2).attributes.at(0).name).toBe("Atributo_Relación_1")
        expect(tables.at(2).attributes.at(0).key).toBe(true)
        expect(tables.at(2).attributes.at(0).foreign_key).toBe("Entidad")
        expect(tables.at(2).attributes.at(1).name).toBe("Atributo_Relación_2")
        expect(tables.at(2).attributes.at(1).key).toBe(true)
        expect(tables.at(2).attributes.at(1).foreign_key).toBe("Entidad 1")
    })
})
