import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    createAttribute,
    createBinaryRelation,
    createDiagram,
    createRelationSide,
    createStrongEntity,
} from '../../helpers/diagramBuilders'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import { generateSQL } from '../../../src/services/sql'

const createForeignKeyCycleRelation = ({
    idMx,
    name,
    side1Entity,
    side1Cardinality,
    side2Entity,
    side2Cardinality,
}) =>
    createBinaryRelation({
        idMx,
        name,
        side1: createRelationSide({
            entity: side1Entity,
            cardinality: side1Cardinality,
        }),
        side2: createRelationSide({
            entity: side2Entity,
            cardinality: side2Cardinality,
        }),
    })

const createForeignKeyCycleGraph = () => {
    const entities = [
        createStrongEntity({
            idMx: '67',
            name: 'A',
            attributes: [
                createAttribute({
                    idMx: '81',
                    name: 'a1',
                    key: true,
                }),
                createAttribute({
                    idMx: '89',
                    name: 'a2',
                }),
            ],
        }),
        createStrongEntity({
            idMx: '69',
            name: 'B',
            keyName: 'b1',
        }),
        createStrongEntity({
            idMx: '70',
            name: 'C',
            keyName: 'c1',
        }),
        createStrongEntity({
            idMx: '72',
            name: 'D',
            keyName: 'd1',
        }),
    ]

    return createDiagram({
        entities,
        relations: [
            createForeignKeyCycleRelation({
                idMx: '91',
                name: 'R1',
                side1Entity: entities[0],
                side1Cardinality: '0:N',
                side2Entity: entities[1],
                side2Cardinality: '0:1',
            }),
            createForeignKeyCycleRelation({
                idMx: '96',
                name: 'R2',
                side1Entity: entities[1],
                side1Cardinality: '0:N',
                side2Entity: entities[2],
                side2Cardinality: '0:1',
            }),
            createForeignKeyCycleRelation({
                idMx: '101',
                name: 'R3',
                side1Entity: entities[2],
                side1Cardinality: '0:1',
                side2Entity: entities[3],
                side2Cardinality: '1:1',
            }),
            createForeignKeyCycleRelation({
                idMx: '106',
                name: 'R4',
                side1Entity: entities[0],
                side1Cardinality: '1:1',
                side2Entity: entities[3],
                side2Cardinality: '0:N',
            }),
        ],
    })
}

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
  Atributo_Relacion VARCHAR(40) REFERENCES Entidad
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
  Atributo_Relacion VARCHAR(40) UNIQUE NOT NULL REFERENCES Entidad_1
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
  Atributo_Relacion_1 VARCHAR(40) REFERENCES Entidad,
  Atributo_Relacion_2 VARCHAR(40) REFERENCES Entidad_1,
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
  Atributo_Relacion VARCHAR(40) NOT NULL REFERENCES Entidad_1
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

    test("should omit the target primary key column in simple foreign key references", () => {
        const sql = generateSQL(oneNGraph)

        expect(sql).toContain(
            "Atributo_Relacion VARCHAR(40) REFERENCES Entidad"
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
        const graph = createForeignKeyCycleGraph()

        const sql = generateSQL(graph)

        expect(sql).toContain('ALTER TABLE')
        expect(countOccurrences(sql, 'ALTER TABLE')).toBe(1)
        expect(sql).toContain('FOREIGN KEY')
    })
});