import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    filterTables,
    processNMRelation,
} from '../../../src/utils/sql'

let nMGraph

beforeEach(() => {
    nMGraph = loadGraphFixture('n-m-relation.json')
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