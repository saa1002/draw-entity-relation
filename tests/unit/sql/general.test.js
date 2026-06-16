import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import { generateSQL } from '../../../src/services/sql'


const { expectSQLToMatch, expectSQLToContain } = buildSQLAssertions(expect)

const countOccurrences = (text, fragment) =>
    text.split(fragment).length - 1

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
  Atributo_Relacion VARCHAR(40) REFERENCES Entidad(Atributo)
);
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
  Atributo_Relacion VARCHAR(40) UNIQUE NOT NULL REFERENCES Entidad_1(Atributo)
);
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
  Atributo_Relacion_1 VARCHAR(40) REFERENCES Entidad(Atributo),
  Atributo_Relacion_2 VARCHAR(40) REFERENCES Entidad_1(Atributo),
  Atributo VARCHAR(40),
  PRIMARY KEY (Atributo_Relacion_1, Atributo_Relacion_2)
);
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
  Atributo_Relacion VARCHAR(40) NOT NULL REFERENCES Entidad_1(Atributo)
);

CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY
);
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
            "Atributo_Relacion VARCHAR(40) REFERENCES Entidad(Atributo)"
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

    test("should keep ALTER TABLE fallback when foreign keys form a cycle", () => {
        const graph = {
            entities: [
                {
                    idMx: '67',
                    name: 'A',
                    weak: false,
                    attributes: [
                        {
                            idMx: '81',
                            name: 'a1',
                            key: true,
                            partialKey: false,
                        },
                        {
                            idMx: '89',
                            name: 'a2',
                            key: false,
                            partialKey: false,
                        },
                    ],
                },
                {
                    idMx: '69',
                    name: 'B',
                    weak: false,
                    attributes: [
                        {
                            idMx: '83',
                            name: 'b1',
                            key: true,
                            partialKey: false,
                        },
                    ],
                },
                {
                    idMx: '70',
                    name: 'C',
                    weak: false,
                    attributes: [
                        {
                            idMx: '85',
                            name: 'c1',
                            key: true,
                            partialKey: false,
                        },
                    ],
                },
                {
                    idMx: '72',
                    name: 'D',
                    weak: false,
                    attributes: [
                        {
                            idMx: '87',
                            name: 'd1',
                            key: true,
                            partialKey: false,
                        },
                    ],
                },
            ],
            relations: [
                {
                    idMx: '91',
                    name: 'R1',
                    side1: {
                        cardinality: '0:N',
                        entity: {
                            idMx: '67',
                        },
                    },
                    side2: {
                        cardinality: '0:1',
                        entity: {
                            idMx: '69',
                        },
                    },
                    canHoldAttributes: false,
                    isIdentifying: false,
                    attributes: [],
                },
                {
                    idMx: '96',
                    name: 'R2',
                    side1: {
                        cardinality: '0:N',
                        entity: {
                            idMx: '69',
                        },
                    },
                    side2: {
                        cardinality: '0:1',
                        entity: {
                            idMx: '70',
                        },
                    },
                    canHoldAttributes: false,
                    isIdentifying: false,
                    attributes: [],
                },
                {
                    idMx: '101',
                    name: 'R3',
                    side1: {
                        cardinality: '0:1',
                        entity: {
                            idMx: '70',
                        },
                    },
                    side2: {
                        cardinality: '1:1',
                        entity: {
                            idMx: '72',
                        },
                    },
                    canHoldAttributes: false,
                    isIdentifying: false,
                    attributes: [],
                },
                {
                    idMx: '106',
                    name: 'R4',
                    side1: {
                        cardinality: '1:1',
                        entity: {
                            idMx: '67',
                        },
                    },
                    side2: {
                        cardinality: '0:N',
                        entity: {
                            idMx: '72',
                        },
                    },
                    canHoldAttributes: false,
                    isIdentifying: false,
                    attributes: [],
                },
            ],
            isas: [],
        }

        const sql = generateSQL(graph)

        expect(sql).toContain('ALTER TABLE')
        expect(countOccurrences(sql, 'ALTER TABLE')).toBe(1)
        expect(sql).toContain('FOREIGN KEY')
    })
});