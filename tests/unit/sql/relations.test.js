import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    filterTables,
    process1NRelation,
    process11Relation,
} from '../../../src/utils/sql'

let oneNGraph
let oneOneGraph

const extract1NTables = () => {
    const filteredTables = filterTables(oneNGraph)
    return process1NRelation(filteredTables.at(0))
}

const extract11Tables = () => {
    const filteredTables = filterTables(oneOneGraph)
    return process11Relation(filteredTables.at(0))
}

beforeEach(() => {
    oneNGraph = loadGraphFixture('1-n-relation.json')
    oneOneGraph = loadGraphFixture('1-1-relation.json')
})

describe("1:N relation extraction", () => {
    test("should extract a nullable foreign key when the 1 side is optional", () => {
        const tables = extract1NTables()
        const sourceTable = tables.at(0)
        const targetTable = tables.at(1)
        const foreignKey = targetTable.attributes.at(1)

        expect(tables.length).toBe(2)
        expect(sourceTable.attributes.length).toBe(1)
        expect(targetTable.attributes.length).toBe(2)
        expect(targetTable.attributes.at(0).name).toBe("Atributo")
        expect(foreignKey.name).toBe("Atributo_Relación")
        expect(foreignKey.notnull).toBe(false)
    })

    test("should extract a non-null foreign key when the 1 side is mandatory", () => {
        oneNGraph.relations.at(0).side1.cardinality = "1:1"

        const tables = extract1NTables()
        const sourceTable = tables.at(0)
        const targetTable = tables.at(1)
        const foreignKey = targetTable.attributes.at(1)

        expect(tables.length).toBe(2)
        expect(sourceTable.attributes.length).toBe(1)
        expect(targetTable.attributes.length).toBe(2)
        expect(targetTable.attributes.at(0).name).toBe("Atributo")
        expect(foreignKey.name).toBe("Atributo_Relación")
        expect(foreignKey.notnull).toBe(true)
    })
})

describe("1:1 relation extraction", () => {
    test("should extract a unique non-null foreign key for a 0:1-1:1 relation", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "0:1"

        const tables = extract11Tables()
        const sourceTable = tables.at(0)
        const targetTable = tables.at(1)
        const foreignKey = targetTable.attributes.at(1)

        expect(tables.length).toBe(2)
        expect(sourceTable.attributes.length).toBe(1)
        expect(targetTable.attributes.length).toBe(2)
        expect(sourceTable.attributes.at(0).name).toBe("Atributo")
        expect(foreignKey.name).toBe("Atributo_Relación")
        expect(foreignKey.notnull).toBe(true)
        expect(foreignKey.unique).toBe(true)
    })

    test("should extract a unique nullable foreign key for a 0:1-0:1 relation", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "0:1"
        oneOneGraph.relations.at(0).side2.cardinality = "0:1"

        const tables = extract11Tables()
        const sourceTable = tables.at(0)
        const targetTable = tables.at(1)
        const foreignKey = targetTable.attributes.at(1)

        expect(tables.length).toBe(2)
        expect(sourceTable.attributes.length).toBe(1)
        expect(targetTable.attributes.length).toBe(2)
        expect(sourceTable.attributes.at(0).name).toBe("Atributo")
        expect(foreignKey.name).toBe("Atributo_Relación")
        expect(foreignKey.notnull).toBe(false)
        expect(foreignKey.unique).toBe(true)
    })

    test("should merge both entities into a single table for a mandatory 1:1 relation", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "1:1"
        oneOneGraph.relations.at(0).side2.cardinality = "1:1"

        const tables = extract11Tables()
        const mergedTable = tables.at(0)

        expect(tables.length).toBe(1)
        expect(mergedTable.name).toBe("Relación")
        expect(mergedTable.attributes.length).toBe(2)

        expect(mergedTable.attributes.at(0).name).toBe("Atributo_Relación")
        expect(mergedTable.attributes.at(0).key).toBe(true)

        expect(mergedTable.attributes.at(1).name).toBe("Atributo_Relación")
        expect(mergedTable.attributes.at(1).notnull).toBe(true)
        expect(mergedTable.attributes.at(1).unique).toBe(true)
    })
})