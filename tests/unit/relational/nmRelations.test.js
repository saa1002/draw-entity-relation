import { beforeEach, describe, expect, test } from 'vitest'
import { createAttribute } from '../../helpers/diagramBuilders'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    filterTables,
    processNMRelation,
} from '../../../src/domain/relational/erToRelationalModel'

let nMGraph

const extractNMTables = () => {
    const filteredTables = filterTables(nMGraph)

    return processNMRelation(filteredTables.at(0))
}

beforeEach(() => {
    nMGraph = loadGraphFixture('n-m-relation.json')
})

describe("N:M relation extraction", () => {
    test("should create a junction table with both foreign keys as a composite primary key", () => {
        const tables = extractNMTables()

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
        const tables = extractNMTables()

        const junctionTable = tables.at(2)
        const relationAttribute = junctionTable.attributes.at(2)

        expect(junctionTable.attributes.length).toBe(3)
        expect(relationAttribute.name).toBe("Atributo")
        expect(relationAttribute.key).toBe(false)
    })

    test("should project composite attributes in participating entity tables", () => {
        nMGraph.entities.at(0).attributes.push(
            createAttribute({
                idMx: '7',
                name: 'direccion',
                children: [
                    createAttribute({
                        idMx: '8',
                        name: 'calle',
                    }),
                    createAttribute({
                        idMx: '9',
                        name: 'ciudad',
                    }),
                ],
            }),
        )

        const tables = extractNMTables()

        const leftEntityTable = tables.at(0);

        expect(leftEntityTable.attributes.map((attr) => attr.name)).toEqual([
            "Atributo",
            "calle",
            "ciudad",
        ]);
        expect(
            leftEntityTable.attributes.some((attr) => attr.name === "direccion"),
        ).toBe(false);
    });
    
    test("should use all leaf columns from a composite primary key in the junction table", () => {
        nMGraph.entities.at(0).attributes = [
            createAttribute({
                idMx: '3',
                name: 'codigo',
                key: true,
                children: [
                    createAttribute({
                        idMx: '7',
                        name: 'serie',
                    }),
                    createAttribute({
                        idMx: '8',
                        name: 'numero',
                    }),
                ],
            }),
        ]

        const tables = extractNMTables()

        const junctionTable = tables.at(2);

        expect(junctionTable.attributes.map((attr) => attr.name)).toEqual([
            "serie_Relación_1",
            "numero_Relación_1",
            "Atributo_Relación_2",
            "Atributo",
        ]);

        expect(
            junctionTable.attributes.slice(0, 2).map(
                (attr) => attr.foreign_key_column,
            ),
        ).toEqual(["serie", "numero"]);
    });
    
    test("should project composite relation attributes in the junction table", () => {
        nMGraph.relations.at(0).attributes = [
            createAttribute({
                idMx: '13',
                name: 'periodo',
                children: [
                    createAttribute({
                        idMx: '14',
                        name: 'inicio',
                    }),
                    createAttribute({
                        idMx: '15',
                        name: 'fin',
                    }),
                ],
            }),
        ]

        const tables = extractNMTables()

        const junctionTable = tables.at(2);

        expect(junctionTable.attributes.map((attr) => attr.name)).toEqual([
            "Atributo_Relación_1",
            "Atributo_Relación_2",
            "inicio",
            "fin",
        ]);

        expect(
            junctionTable.attributes.some((attr) => attr.name === "periodo"),
        ).toBe(false);
    });
})