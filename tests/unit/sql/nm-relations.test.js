import { beforeEach, describe, expect, test } from 'vitest'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    filterTables,
    processNMRelation,
} from '../../../src/domain/relational/erToRelationalModel'
import { generateSQL } from '../../../src/services/sql'

let nMGraph

const { expectSQLToContain } = buildSQLAssertions(expect)

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
            "calle",
            "ciudad",
        ]);
        expect(
            leftEntityTable.attributes.some((attr) => attr.name === "direccion"),
        ).toBe(false);
    });
    
    test("should use all leaf columns from a composite primary key in the junction table", () => {
        nMGraph.entities.at(0).attributes = [
            {
                idMx: "3",
                name: "codigo",
                key: true,
                partialKey: false,
                children: [
                    {
                        idMx: "7",
                        name: "serie",
                        key: false,
                        partialKey: false,
                    },
                    {
                        idMx: "8",
                        name: "numero",
                        key: false,
                        partialKey: false,
                    },
                ],
            },
        ];

        const filteredTables = filterTables(nMGraph);
        const tables = processNMRelation(filteredTables.at(0));

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
            {
                idMx: "13",
                name: "periodo",
                key: false,
                partialKey: false,
                children: [
                    {
                        idMx: "14",
                        name: "inicio",
                        key: false,
                        partialKey: false,
                    },
                    {
                        idMx: "15",
                        name: "fin",
                        key: false,
                        partialKey: false,
                    },
                ],
            },
        ];

        const filteredTables = filterTables(nMGraph);
        const tables = processNMRelation(filteredTables.at(0));

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
    
    test("should generate a separate table for a simple multivalued attribute on an N:M related entity", () => {
        nMGraph.entities.at(0).attributes.push({
            idMx: "attr-email",
            name: "email",
            key: false,
            partialKey: false,
            multivalued: true,
        });

        const sql = generateSQL(nMGraph);

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_email (
              Atributo VARCHAR(40),
              email VARCHAR(40),
              PRIMARY KEY (Atributo, email)
            );
            `,
        );

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Entidad_email
            ADD CONSTRAINT FK_Entidad_email_Entidad_owner
            FOREIGN KEY (Atributo)
            REFERENCES Entidad(Atributo)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
            `,
        );

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Relacion (
              Atributo_Relacion_1 VARCHAR(40),
              Atributo_Relacion_2 VARCHAR(40),
              Atributo VARCHAR(40),
              PRIMARY KEY (Atributo_Relacion_1, Atributo_Relacion_2)
            );
            `,
        );

        expect(sql).not.toContain("email_Relacion");
    });
})