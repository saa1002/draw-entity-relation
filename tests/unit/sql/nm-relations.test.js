import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    filterTables,
    processNMRelation,
} from '../../../src/services/sql'

let nMGraph

beforeEach(() => {
    nMGraph = loadGraphFixture('n-m-relation.json')
})

describe("N:M relation extraction", () => {
    test("should create a junction table with both foreign keys as a composite primary key", () => {
        const filteredTables = filterTables(nMGraph)
        const tables = processNMRelation(filteredTables.at(0))

        const leftEntityTable = tables.at(0)
        const rightEntityTable = tables.at(1)
        const junctionTable = tables.at(2)

        const leftForeignKey = junctionTable.attributes.at(0)
        const rightForeignKey = junctionTable.attributes.at(1)

        expect(tables.length).toBe(3)
        expect(leftEntityTable.attributes.length).toBe(1)
        expect(rightEntityTable.attributes.length).toBe(1)
        expect(junctionTable.attributes.length).toBe(3)

        expect(leftForeignKey.name).toBe("Atributo_Relación_1")
        expect(leftForeignKey.key).toBe(true)
        expect(leftForeignKey.foreign_key).toBe("Entidad")

        expect(rightForeignKey.name).toBe("Atributo_Relación_2")
        expect(rightForeignKey.key).toBe(true)
        expect(rightForeignKey.foreign_key).toBe("Entidad 1")
    })

    test("should keep relation attributes in the junction table", () => {
        const filteredTables = filterTables(nMGraph)
        const tables = processNMRelation(filteredTables.at(0))

        const junctionTable = tables.at(2)
        const relationAttribute = junctionTable.attributes.at(2)

        expect(junctionTable.attributes.length).toBe(3)
        expect(relationAttribute.name).toBe("Atributo")
        expect(relationAttribute.key).toBe(false)
    })

    test("should project composite attributes in participating entity tables", () => {
        nMGraph.entities.at(0).attributes.push({
            idMx: "7",
            name: "direccion",
            key: false,
            partialKey: false,
            children: [
                {
                    idMx: "8",
                    name: "calle",
                    key: false,
                    partialKey: false,
                },
                {
                    idMx: "9",
                    name: "ciudad",
                    key: false,
                    partialKey: false,
                },
            ],
        });

        const filteredTables = filterTables(nMGraph);
        const tables = processNMRelation(filteredTables.at(0));

        const leftEntityTable = tables.at(0);

        expect(leftEntityTable.attributes.map((attr) => attr.name)).toEqual([
            "Atributo",
            "direccion_calle",
            "direccion_ciudad",
        ]);
        expect(
            leftEntityTable.attributes.some((attr) => attr.name === "direccion"),
        ).toBe(false);
    });    
})