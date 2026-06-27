import { describe, expect, test } from 'vitest'
import {
    createAttribute,
    createDiagram,
    createStrongEntity,
} from '../../helpers/diagramBuilders'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import { generateSQL } from '../../../src/services/sql'

const { expectSQLToContain, expectSQLNotToContain } =
    buildSQLAssertions(expect)

const createStandaloneEntityGraph = ({
    idMx = '1',
    name = 'Cliente',
    attributes,
}) =>
    createDiagram({
        entities: [
            createStrongEntity({
                idMx,
                name,
                attributes,
            }),
        ],
    })

describe('Standalone entity SQL generation', () => {
    test('a standalone strong entity should generate a single table with its primary key', () => {
        const graph = createStandaloneEntityGraph({
            attributes: [
                createAttribute({
                    idMx: '2',
                    name: 'id_cliente',
                    key: true,
                }),
                createAttribute({
                    idMx: '3',
                    name: 'nombre',
                }),
            ],
        })

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE Cliente')
        expect(sql).toContain('id_cliente VARCHAR(40) PRIMARY KEY')
        expect(sql).toContain('nombre VARCHAR(40)')
        expect(sql).not.toContain('ALTER TABLE')
        expect(sql).not.toContain('FOREIGN KEY')
    })

    test('a standalone strong entity should project composite attributes to leaf columns', () => {
        const graph = createStandaloneEntityGraph({
            attributes: [
                createAttribute({
                    idMx: '2',
                    name: 'id_cliente',
                    key: true,
                }),
                createAttribute({
                    idMx: '3',
                    name: 'direccion',
                    children: [
                        createAttribute({
                            idMx: '4',
                            name: 'calle',
                        }),
                        createAttribute({
                            idMx: '5',
                            name: 'ciudad',
                        }),
                    ],
                }),
            ],
        })

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE Cliente')
        expect(sql).toContain('id_cliente VARCHAR(40) PRIMARY KEY')
        expect(sql).toContain('calle VARCHAR(40)')
        expect(sql).toContain('ciudad VARCHAR(40)')
        expect(sql).not.toContain('direccion VARCHAR(40)')
    })

    test('a standalone strong entity should project a composite primary key to leaf columns', () => {
        const graph = createStandaloneEntityGraph({
            name: 'Documento',
            attributes: [
                createAttribute({
                    idMx: '2',
                    name: 'codigo',
                    key: true,
                    children: [
                        createAttribute({
                            idMx: '3',
                            name: 'serie',
                        }),
                        createAttribute({
                            idMx: '4',
                            name: 'numero',
                        }),
                    ],
                }),
            ],
        })

        const sql = generateSQL(graph)

        expect(sql).toContain('serie VARCHAR(40)')
        expect(sql).toContain('numero VARCHAR(40)')
        expect(sql).toContain('PRIMARY KEY (serie, numero)')
        expect(sql).not.toContain('codigo VARCHAR(40)')
    })

    test('a composite connector name should not be emitted in standalone entity SQL', () => {
        const graph = createStandaloneEntityGraph({
            attributes: [
                createAttribute({
                    idMx: '2',
                    name: 'internal_direccion_connector',
                    key: true,
                    children: [
                        createAttribute({
                            idMx: '3',
                            name: 'calle',
                        }),
                        createAttribute({
                            idMx: '4',
                            name: 'ciudad',
                        }),
                    ],
                }),
            ],
        })

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Cliente (
            calle VARCHAR(40),
            ciudad VARCHAR(40),
            PRIMARY KEY (calle, ciudad)
            );
            `,
        )

        expectSQLNotToContain(sql, 'internal_direccion_connector')
    })

    test('a standalone entity should generate a separate table for a simple multivalued attribute', () => {
        const graph = createStandaloneEntityGraph({
            attributes: [
                createAttribute({
                    idMx: '2',
                    name: 'id_cliente',
                    key: true,
                }),
                createAttribute({
                    idMx: '3',
                    name: 'telefono',
                    multivalued: true,
                }),
            ],
        })

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE Cliente')
        expect(sql).toContain('id_cliente VARCHAR(40) PRIMARY KEY')

        expect(sql).toContain('CREATE TABLE Cliente_telefono')
        expect(sql).toContain('id_cliente VARCHAR(40)')
        expect(sql).toContain('telefono VARCHAR(40)')
        expect(sql).toContain('PRIMARY KEY (id_cliente, telefono)')

        expect(sql).toContain(
            'id_cliente VARCHAR(40) REFERENCES Cliente ON DELETE CASCADE ON UPDATE CASCADE',
        )

        expect(sql).not.toContain('telefono VARCHAR(40),\n  PRIMARY KEY')
    })

    test('a simple multivalued attribute should reference every column of a composite owner key', () => {
        const graph = createStandaloneEntityGraph({
            name: 'Documento',
            attributes: [
                createAttribute({
                    idMx: '2',
                    name: 'codigo',
                    key: true,
                    children: [
                        createAttribute({
                            idMx: '3',
                            name: 'serie',
                        }),
                        createAttribute({
                            idMx: '4',
                            name: 'numero',
                        }),
                    ],
                }),
                createAttribute({
                    idMx: '5',
                    name: 'etiqueta',
                    multivalued: true,
                }),
            ],
        })

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Documento (
              serie VARCHAR(40),
              numero VARCHAR(40),
              PRIMARY KEY (serie, numero)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Documento_etiqueta (
                serie VARCHAR(40),
                numero VARCHAR(40),
                etiqueta VARCHAR(40), 
                PRIMARY KEY (serie, numero, etiqueta)
            `,
        )

        expect(sql).toContain(
            'FOREIGN KEY (serie, numero) REFERENCES Documento ON DELETE CASCADE ON UPDATE CASCADE',
        )
    })

    test('a standalone entity should generate a separate table for a composite multivalued attribute', () => {
        const graph = createStandaloneEntityGraph({
            attributes: [
                createAttribute({
                    idMx: '2',
                    name: 'id_cliente',
                    key: true,
                }),
                createAttribute({
                    idMx: '3',
                    name: 'telefonos',
                    multivalued: true,
                    children: [
                        createAttribute({
                            idMx: '4',
                            name: 'prefijo',
                        }),
                        createAttribute({
                            idMx: '5',
                            name: 'numero',
                        }),
                    ],
                }),
            ],
        })

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Cliente (
              id_cliente VARCHAR(40) PRIMARY KEY
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Cliente_telefonos (
            id_cliente VARCHAR(40) REFERENCES Cliente ON DELETE CASCADE ON UPDATE CASCADE,
            prefijo VARCHAR(40),
            numero VARCHAR(40), 
            PRIMARY KEY (id_cliente, prefijo, numero)
            );
            `,
        )

        expect(sql).not.toContain('telefonos VARCHAR(40)')
    })
})