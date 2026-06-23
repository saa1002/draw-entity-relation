import { beforeEach, describe, expect, test } from 'vitest'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    createAttribute,
    createBinaryRelation,
    createDiagram,
    createRelationSide,
    createStrongEntity,
} from '../../helpers/diagramBuilders'
import { generateSQL } from '../../../src/services/sql'

let oneNGraph
let oneOneGraph

const { expectSQLToContain, expectSQLNotToContain } =
    buildSQLAssertions(expect)

beforeEach(() => {
    oneNGraph = loadGraphFixture('1-n-relation.json')
    oneOneGraph = loadGraphFixture('1-1-relation.json')
})

const makeOneOneRelationMandatory = () => {
    oneOneGraph.relations.at(0).side1.cardinality = '1:1'
    oneOneGraph.relations.at(0).side2.cardinality = '1:1'
}

const createCompositeConnectorOneNGraph = () =>
    createDiagram({
        entities: [
            createStrongEntity({
                idMx: 'cliente',
                name: 'Cliente',
                attributes: [
                    createAttribute({
                        idMx: 'attr-internal-client-key',
                        name: 'internal_cliente_key_connector',
                        key: true,
                        children: [
                            createAttribute({
                                idMx: 'attr-calle',
                                name: 'calle',
                            }),
                            createAttribute({
                                idMx: 'attr-ciudad',
                                name: 'ciudad',
                            }),
                        ],
                    }),
                ],
            }),
            createStrongEntity({
                idMx: 'pedido',
                name: 'Pedido',
                keyName: 'id_pedido',
            })
        ],
        relations: [
            createBinaryRelation({
                idMx: 'relation-compra',
                name: 'Compra',
                side1: createRelationSide({
                    idMx: 'side-cliente',
                    cardinality: '1:1',
                    cell: 'side-cell-cliente',
                    edgeId: 'edge-cliente',
                    entity: 'cliente',
                }),
                side2: createRelationSide({
                    idMx: 'side-pedido',
                    cardinality: '0:N',
                    cell: 'side-cell-pedido',
                    edgeId: 'edge-pedido',
                    entity: 'pedido',
                }),
            })
        ],
    })

describe('1:N relation SQL generation', () => {
    test('should not use composite connector names in 1:N foreign key columns or constraints', () => {
        const graph = createCompositeConnectorOneNGraph()

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Pedido (
            id_pedido VARCHAR(40) PRIMARY KEY,
            calle_Compra VARCHAR(40) NOT NULL,
            ciudad_Compra VARCHAR(40) NOT NULL, 
            FOREIGN KEY (calle_Compra, ciudad_Compra) REFERENCES Cliente
            )
            `,
        )

        expectSQLNotToContain(sql, 'internal_cliente_key_connector')
    })

    test('should generate a separate table for a simple multivalued attribute on a 1:N related entity', () => {
        oneNGraph.entities.at(1).attributes.push(
            createAttribute({
                idMx: 'attr-phones',
                name: 'telefono',
                multivalued: true,
            }),
        )

        const sql = generateSQL(oneNGraph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_1_telefono (
            Atributo VARCHAR(40) REFERENCES Entidad_1 ON DELETE CASCADE ON UPDATE CASCADE,
            telefono VARCHAR(40),
            PRIMARY KEY (Atributo, telefono)
            )
            `,
        )

        expect(sql).not.toContain('telefono VARCHAR(40) PRIMARY KEY')
    })

    test('should generate a separate table for a composite multivalued attribute on a 1:N related entity', () => {
        oneNGraph.entities.at(1).attributes.push(
            createAttribute({
                idMx: 'attr-contact',
                name: 'contacto',
                multivalued: true,
                children: [
                    createAttribute({
                        idMx: 'attr-prefix',
                        name: 'prefijo',
                    }),
                    createAttribute({
                        idMx: 'attr-number',
                        name: 'numero',
                    }),
                ],
            }),
        )

        const sql = generateSQL(oneNGraph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_1_contacto (
            Atributo VARCHAR(40) REFERENCES Entidad_1 ON DELETE CASCADE ON UPDATE CASCADE,
            prefijo VARCHAR(40),
            numero VARCHAR(40),
            PRIMARY KEY (Atributo, prefijo, numero)
            )
            `,
        )

        expect(sql).not.toContain('contacto VARCHAR(40)')
        expect(sql).not.toContain('prefijo VARCHAR(40) PRIMARY KEY')
    })
})

describe('1:1 relation SQL generation', () => {
    test('should reference the merged table for a multivalued attribute in a mandatory 1:1 relation', () => {
        makeOneOneRelationMandatory()

        oneOneGraph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-phone',
                name: 'telefono',
                multivalued: true,
            }),
        )

        const sql = generateSQL(oneOneGraph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_telefono (
            Atributo_Relacion VARCHAR(40) REFERENCES Relacion ON DELETE CASCADE ON UPDATE CASCADE,
            telefono VARCHAR(40),
            PRIMARY KEY (Atributo_Relacion, telefono)
            )
            `,
        )

        expect(sql).not.toContain('REFERENCES Entidad(Atributo)')
    })
    
    test('should reference the merged table for a composite multivalued attribute in a mandatory 1:1 relation', () => {
        makeOneOneRelationMandatory()

        oneOneGraph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-contact',
                name: 'contacto',
                multivalued: true,
                children: [
                    createAttribute({
                        idMx: 'attr-prefix',
                        name: 'prefijo',
                    }),
                    createAttribute({
                        idMx: 'attr-number',
                        name: 'numero',
                    }),
                ],
            }),
        )

        const sql = generateSQL(oneOneGraph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_contacto (
            Atributo_Relacion VARCHAR(40) REFERENCES Relacion ON DELETE CASCADE ON UPDATE CASCADE,
            prefijo VARCHAR(40),
            numero VARCHAR(40),
            PRIMARY KEY (Atributo_Relacion, prefijo, numero)
            )
            `,
        )

        expect(sql).not.toContain('REFERENCES Entidad(Atributo)')
        expect(sql).not.toContain('prefijo_Relacion VARCHAR(40)')
        expect(sql).not.toContain('numero_Relacion VARCHAR(40)')
    })
})