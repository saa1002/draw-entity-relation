import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { generateSQL } from '../../../src/utils/sql'

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

describe("Generate SQL", () => {
    test("1:N relation", () => {
        const sql = generateSQL(oneNGraph);
        const expectedSQL = 
`CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY,
  Atributo_Relacion VARCHAR(40)
);

ALTER TABLE Entidad_1 ADD CONSTRAINT FK_Atributo_Relacion FOREIGN KEY (Atributo_Relacion) REFERENCES Entidad(Atributo);
`;
        expect(sql.replace(/\s+/g, '')).toBe(expectedSQL.replace(/\s+/g, ''));
    });

    test("1:1 relation, 0:1-1:1", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "0:1"
        const sql = generateSQL(oneOneGraph);
        const expectedSQL = 
`CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY,
  Atributo_Relacion VARCHAR(40) UNIQUE NOT NULL
);

ALTER TABLE Entidad ADD CONSTRAINT FK_Atributo_Relacion FOREIGN KEY (Atributo_Relacion) REFERENCES Entidad_1(Atributo);
`;
        expect(sql.replace(/\s+/g, '')).toBe(expectedSQL.replace(/\s+/g, ''));
    });

    test("N:M relation", () => {
        const sql = generateSQL(nMGraph);
        const expectedSQL = 
`CREATE TABLE Entidad (
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

        expect(sql.replace(/\s+/g, '')).toBe(expectedSQL.replace(/\s+/g, ''));
    });

    test("Complete Graph", () => {
        const sql = generateSQL(oneNGraphAndEntity)

        const expectedSQL = 
`
CREATE TABLE Entidad_1 (
  Atributo VARCHAR(40) PRIMARY KEY
);

CREATE TABLE Entidad_2(
  Atributo VARCHAR(40) PRIMARY KEY,
  Atributo_Relacion VARCHAR(40) NOT NULL
);

CREATE TABLE Entidad (
  Atributo VARCHAR(40) PRIMARY KEY
);

ALTER TABLE Entidad_2 ADD CONSTRAINT FK_Atributo_Relacion FOREIGN KEY (Atributo_Relacion) REFERENCES Entidad_1(Atributo);
`;

        expect(sql.replace(/\s+/g, '')).toBe(expectedSQL.replace(/\s+/g, ''));
    });

    test("Foreign key references should use normalized table names", () => {
        oneNGraph.entities.at(0).name = "País";
        oneNGraph.entities.at(1).name = "Ciudad";

        const sql = generateSQL(oneNGraph);

        expect(sql).toContain("CREATE TABLE Pais");
        expect(sql).toContain("REFERENCES Pais");
    });

    test("Foreign key constraints should reference the target primary key column", () => {
        const sql = generateSQL(oneNGraph);

        expect(sql).toContain(
            "FOREIGN KEY (Atributo_Relacion) REFERENCES Entidad(Atributo)"
        );
    });
});