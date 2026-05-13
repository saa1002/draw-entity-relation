import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { generateSQL, filterTables } from '../../../src/services/sql'

let oneNGraph
let oneOneGraph
let nMGraph
let oneNGraphAndEntity

const expectSQLToMatch = (actual, expected) => {
    expect(actual.replace(/\s+/g, '')).toBe(expected.replace(/\s+/g, ''))
}

beforeEach(() => {
    oneNGraph = loadGraphFixture('1-n-relation.json')
    oneOneGraph = loadGraphFixture('1-1-relation.json')
    nMGraph = loadGraphFixture('n-m-relation.json')
    oneNGraphAndEntity = loadGraphFixture('1-n-relation_alone-entity.json')
})

describe("Table filtering", () => {
    test("should classify a 1:1 relation as a single table candidate", () => {
        const tables = filterTables(oneOneGraph)
        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe("1:1")
    })

    test("should classify a 1:N relation as a single table candidate", () => {
        const tables = filterTables(oneNGraph)
        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe("1:N")
    })

    test("should classify an N:M relation as a single table candidate", () => {
        const tables = filterTables(nMGraph)
        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe("N:M")
    })

    test("should preserve unconnected entities when filtering table candidates", () => {
        const tables = filterTables(oneNGraphAndEntity)
        expect(tables.length).toBe(2)
        expect(tables.at(0).type).toBe("1:N")
        expect(tables.at(0).name).toBe("Relación")
        expect(tables.at(1).name).toBe("Entidad")
    })
})

describe("SQL generation", () => {
    test("should generate SQL for a 1:N relation", () => {
        const sql = generateSQL(oneNGraph)
        const expectedSQL = 
`DROP TABLE IF EXISTS Entidad, Entidad_1 CASCADE;

CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY,
  Atributo_Relacion VARCHAR(40)
);

ALTER TABLE Entidad_1 ADD CONSTRAINT FK_Atributo_Relacion FOREIGN KEY (Atributo_Relacion) REFERENCES Entidad(Atributo);
`;
        expectSQLToMatch(sql, expectedSQL)
    });

    test("should generate SQL for a 0:1-1:1 relation", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "0:1"
        const sql = generateSQL(oneOneGraph)
        const expectedSQL = 
`DROP TABLE IF EXISTS Entidad_1, Entidad CASCADE;

CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY,
  Atributo_Relacion VARCHAR(40) UNIQUE NOT NULL
);

ALTER TABLE Entidad ADD CONSTRAINT FK_Atributo_Relacion FOREIGN KEY (Atributo_Relacion) REFERENCES Entidad_1(Atributo);
`;
        expectSQLToMatch(sql, expectedSQL)
    });

    test("should generate SQL for an N:M relation", () => {
        const sql = generateSQL(nMGraph)
        const expectedSQL = 
`DROP TABLE IF EXISTS Entidad, Entidad_1, Relacion CASCADE;

CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Relacion (
  Atributo_Relacion_1 VARCHAR(40),
  Atributo_Relacion_2 VARCHAR(40),
  Atributo VARCHAR(40),
  PRIMARY KEY (Atributo_Relacion_1, Atributo_Relacion_2)
);

ALTER TABLE Relacion ADD CONSTRAINT FK_Atributo_Relacion_1 FOREIGN KEY (Atributo_Relacion_1) REFERENCES Entidad(Atributo);
ALTER TABLE Relacion ADD CONSTRAINT FK_Atributo_Relacion_2 FOREIGN KEY (Atributo_Relacion_2) REFERENCES Entidad_1(Atributo);
`;

        expectSQLToMatch(sql, expectedSQL)
    });

    test("should generate SQL for a graph with an isolated entity", () => {
        const sql = generateSQL(oneNGraphAndEntity)

        const expectedSQL = 
`DROP TABLE IF EXISTS Entidad_1, Entidad_2, Entidad CASCADE;

CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad_2 (
  Atributo VARCHAR(40) PRIMARY KEY,
  Atributo_Relacion VARCHAR(40) NOT NULL
);

CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY
);

ALTER TABLE Entidad_2 ADD CONSTRAINT FK_Atributo_Relacion FOREIGN KEY (Atributo_Relacion) REFERENCES Entidad_1(Atributo);
`;

        expectSQLToMatch(sql, expectedSQL)
    });

    test("should use normalized table names in foreign key references", () => {
        oneNGraph.entities.at(0).name = "País";
        oneNGraph.entities.at(1).name = "Ciudad";

        const sql = generateSQL(oneNGraph);

        expect(sql).toContain("CREATE TABLE Pais")
        expect(sql).toContain("REFERENCES Pais")
    });

    test("should reference the target primary key column in foreign keys", () => {
        const sql = generateSQL(oneNGraph)

        expect(sql).toContain(
            "FOREIGN KEY (Atributo_Relacion) REFERENCES Entidad(Atributo)"
        );
    });
    
    test("should generate leaf columns for composite attributes in an N:M relation", () => {
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

        const sql = generateSQL(nMGraph);

        expect(sql).toContain("inicio VARCHAR(40)");
        expect(sql).toContain("fin VARCHAR(40)");
        expect(sql).not.toContain("periodo VARCHAR(40)");
    });
});