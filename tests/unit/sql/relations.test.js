import { beforeEach, describe, expect, test } from 'vitest'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { generateSQL } from '../../../src/services/sql'

let oneNGraph
let oneOneGraph

const { expectSQLToContain, expectSQLNotToContain } =
    buildSQLAssertions(expect)

beforeEach(() => {
    oneNGraph = loadGraphFixture('1-n-relation.json')
    oneOneGraph = loadGraphFixture('1-1-relation.json')
})

describe("1:N relation SQL generation", () => {
    test("should not use composite connector names in 1:N foreign key columns or constraints", () => {
        const graph = {
            entities: [
                {
                    idMx: "cliente",
                    name: "Cliente",
                    weak: false,
                    attributes: [
                        {
                            idMx: "attr-internal-client-key",
                            name: "internal_cliente_key_connector",
                            key: true,
                            partialKey: false,
                            children: [
                                {
                                    idMx: "attr-calle",
                                    name: "calle",
                                    key: false,
                                    partialKey: false,
                                },
                                {
                                    idMx: "attr-ciudad",
                                    name: "ciudad",
                                    key: false,
                                    partialKey: false,
                                },
                            ],
                        },
                    ],
                },
                {
                    idMx: "pedido",
                    name: "Pedido",
                    weak: false,
                    attributes: [
                        {
                            idMx: "attr-id-pedido",
                            name: "id_pedido",
                            key: true,
                            partialKey: false,
                        },
                    ],
                },
            ],
            relations: [
                {
                    idMx: "relation-compra",
                    name: "Compra",
                    canHoldAttributes: false,
                    isIdentifying: false,
                    attributes: [],
                    side1: {
                        idMx: "side-cliente",
                        cardinality: "1:1",
                        cell: "side-cell-cliente",
                        edgeId: "edge-cliente",
                        entity: {
                            idMx: "cliente",
                        },
                    },
                    side2: {
                        idMx: "side-pedido",
                        cardinality: "0:N",
                        cell: "side-cell-pedido",
                        edgeId: "edge-pedido",
                        entity: {
                            idMx: "pedido",
                        },
                    },
                },
            ],
        }

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Pedido (
            id_pedido VARCHAR(40) PRIMARY KEY,
            calle_Compra VARCHAR(40) NOT NULL,
            ciudad_Compra VARCHAR(40) NOT NULL
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Pedido
            ADD CONSTRAINT FK_calle_ciudad_Compra
            FOREIGN KEY (calle_Compra, ciudad_Compra)
            REFERENCES Cliente(calle, ciudad);
            `,
        )

        expectSQLNotToContain(sql, "internal_cliente_key_connector")
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

    test("should generate a separate table for a composite multivalued attribute on a 1:N related entity", () => {
        oneNGraph.entities.at(1).attributes.push({
            idMx: "attr-contact",
            name: "contacto",
            key: false,
            partialKey: false,
            multivalued: true,
            children: [
                {
                    idMx: "attr-prefix",
                    name: "prefijo",
                    key: false,
                    partialKey: false,
                },
                {
                    idMx: "attr-number",
                    name: "numero",
                    key: false,
                    partialKey: false,
                },
            ],
        });

        const sql = generateSQL(oneNGraph);

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_1_contacto (
              Atributo VARCHAR(40),
              prefijo VARCHAR(40),
              numero VARCHAR(40),
              PRIMARY KEY (Atributo, prefijo, numero)
            );
            `,
        );

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Entidad_1_contacto
            ADD CONSTRAINT FK_Entidad_1_contacto_Entidad_1_owner
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

        expect(sql).not.toContain("contacto VARCHAR(40)");
        expect(sql).not.toContain("prefijo VARCHAR(40) PRIMARY KEY");
    });
})

describe("1:1 relation SQL generation", () => {
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
    
    test("should reference the merged table for a composite multivalued attribute in a mandatory 1:1 relation", () => {
        oneOneGraph.relations.at(0).side1.cardinality = "1:1";
        oneOneGraph.relations.at(0).side2.cardinality = "1:1";

        oneOneGraph.entities.at(0).attributes.push({
            idMx: "attr-contact",
            name: "contacto",
            key: false,
            partialKey: false,
            multivalued: true,
            children: [
                {
                    idMx: "attr-prefix",
                    name: "prefijo",
                    key: false,
                    partialKey: false,
                },
                {
                    idMx: "attr-number",
                    name: "numero",
                    key: false,
                    partialKey: false,
                },
            ],
        });

        const sql = generateSQL(oneOneGraph);

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_contacto (
              Atributo_Relacion VARCHAR(40),
              prefijo VARCHAR(40),
              numero VARCHAR(40),
              PRIMARY KEY (Atributo_Relacion, prefijo, numero)
            );
            `,
        );

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Entidad_contacto
            ADD CONSTRAINT FK_Entidad_contacto_Relacion_owner
            FOREIGN KEY (Atributo_Relacion)
            REFERENCES Relacion(Atributo_Relacion)
            ON DELETE CASCADE
            ON UPDATE CASCADE;
            `,
        );

        expect(sql).not.toContain("REFERENCES Entidad(Atributo)");
        expect(sql).not.toContain("prefijo_Relacion VARCHAR(40)");
        expect(sql).not.toContain("numero_Relacion VARCHAR(40)");
    });
})