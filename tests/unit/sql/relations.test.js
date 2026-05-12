import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    filterTables,
    generateSQL,
    process1NRelation,
    process11Relation,
} from '../../../src/services/sql'

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

const compactSQL = (sql) => sql.replace(/\s+/g, '')

const expectSQLToContain = (actual, expectedFragment) => {
    expect(compactSQL(actual)).toContain(compactSQL(expectedFragment))
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

    test("should project composite attributes in related entity tables", () => {
        oneNGraph.entities.at(1).attributes.push({
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

        const tables = extract1NTables();
        const targetTable = tables.at(1);

        expect(targetTable.attributes.map((attr) => attr.name)).toEqual([
            "Atributo",
            "direccion_calle",
            "direccion_ciudad",
            "Atributo_Relación",
        ]);
        expect(
            targetTable.attributes.some((attr) => attr.name === "direccion"),
        ).toBe(false);
    });

    test("should copy all leaf columns from a composite primary key in a 1:N relation", () => {
        oneNGraph.entities.at(0).attributes = [
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

        const tables = extract1NTables();
        const targetTable = tables.at(1);

        expect(targetTable.attributes.map((attr) => attr.name)).toEqual([
            "Atributo",
            "codigo_serie_Relación",
            "codigo_numero_Relación",
        ]);

        expect(
            targetTable.attributes.slice(1).map((attr) => attr.foreign_key_column),
        ).toEqual(["codigo_serie", "codigo_numero"]);
    });
    
    test("should generate a separate table for a simple multivalued attribute on a 1:N related entity", () => {
        oneNGraph.entities.at(1).attributes.push({
            idMx: "attr-phones",
            name: "telefono",
            key: false,
            partialKey: false,
            multivalued: true,
        });

        const sql = generateSQL(oneNGraph);

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_1_telefono (
              Atributo VARCHAR(40),
              telefono VARCHAR(40),
              PRIMARY KEY (Atributo, telefono)
            );
            `,
        );

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Entidad_1_telefono
            ADD CONSTRAINT FK_Entidad_1_telefono_Entidad_1_owner
            FOREIGN KEY (Atributo)
            REFERENCES Entidad_1(Atributo)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
            `,
        );

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_1 (
              Atributo VARCHAR(40) PRIMARY KEY,
              Atributo_Relacion VARCHAR(40)
            );
            `,
        );

        expect(sql).not.toContain("telefono VARCHAR(40) PRIMARY KEY");
    });
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
    
    test("should project composite attributes when a mandatory 1:1 relation merges both entities", () => {
        oneOneGraph.entities.at(0).attributes.push({
            idMx: "7",
            name: "nombre",
            key: false,
            partialKey: false,
            children: [
                {
                    idMx: "8",
                    name: "primero",
                    key: false,
                    partialKey: false,
                },
                {
                    idMx: "9",
                    name: "segundo",
                    key: false,
                    partialKey: false,
                },
            ],
        });

        const tables = extract11Tables();
        const mergedTable = tables.at(0);

        expect(mergedTable.attributes.map((attr) => attr.name)).toContain(
            "nombre_primero_Relación",
        );
        expect(mergedTable.attributes.map((attr) => attr.name)).toContain(
            "nombre_segundo_Relación",
        );
        expect(mergedTable.attributes.map((attr) => attr.name)).not.toContain(
            "nombre_Relación",
        );
    });
    
    test("should reference the merged table for a multivalued attribute in a mandatory 1:1 relation", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "1:1";
        oneOneGraph.relations.at(0).side2.cardinality = "1:1";

        oneOneGraph.entities.at(0).attributes.push({
            idMx: "attr-phone",
            name: "telefono",
            key: false,
            partialKey: false,
            multivalued: true,
        });

        const sql = generateSQL(oneOneGraph);

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_telefono (
              Atributo_Relacion VARCHAR(40),
              telefono VARCHAR(40),
              PRIMARY KEY (Atributo_Relacion, telefono)
            );
            `,
        );

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Entidad_telefono
            ADD CONSTRAINT FK_Entidad_telefono_Relacion_owner
            FOREIGN KEY (Atributo_Relacion)
            REFERENCES Relacion(Atributo_Relacion)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
            `,
        );

        expect(sql).not.toContain("REFERENCES Entidad(Atributo)");
    });
})