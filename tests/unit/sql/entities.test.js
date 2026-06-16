import { describe, expect, test } from 'vitest'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import { generateSQL } from '../../../src/services/sql'

const { expectSQLToContain, expectSQLNotToContain } =
    buildSQLAssertions(expect)

describe('Standalone entity SQL generation', () => {
    test('a standalone strong entity should generate a single table with its primary key', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Cliente',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'id_cliente',
                            key: true,
                            partialKey: false,
                        },
                        {
                            idMx: '3',
                            name: 'nombre',
                            key: false,
                            partialKey: false,
                        },
                    ],
                },
            ],
            relations: [],
        }

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE Cliente')
        expect(sql).toContain('id_cliente VARCHAR(40) PRIMARY KEY')
        expect(sql).toContain('nombre VARCHAR(40)')
        expect(sql).not.toContain('ALTER TABLE')
        expect(sql).not.toContain('FOREIGN KEY')
    })

    test('a standalone strong entity should project composite attributes to leaf columns', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Cliente',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'id_cliente',
                            key: true,
                            partialKey: false,
                        },
                        {
                            idMx: '3',
                            name: 'direccion',
                            key: false,
                            partialKey: false,
                            children: [
                                {
                                    idMx: '4',
                                    name: 'calle',
                                    key: false,
                                    partialKey: false,
                                },
                                {
                                    idMx: '5',
                                    name: 'ciudad',
                                    key: false,
                                    partialKey: false,
                                },
                            ],
                        },
                    ],
                },
            ],
            relations: [],
        }

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE Cliente')
        expect(sql).toContain('id_cliente VARCHAR(40) PRIMARY KEY')
        expect(sql).toContain('calle VARCHAR(40)')
        expect(sql).toContain('ciudad VARCHAR(40)')
        expect(sql).not.toContain('direccion VARCHAR(40)')
    })

    test('a standalone strong entity should project a composite primary key to leaf columns', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Documento',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'codigo',
                            key: true,
                            partialKey: false,
                            children: [
                                {
                                    idMx: '3',
                                    name: 'serie',
                                    key: false,
                                    partialKey: false,
                                },
                                {
                                    idMx: '4',
                                    name: 'numero',
                                    key: false,
                                    partialKey: false,
                                },
                            ],
                        },
                    ],
                },
            ],
            relations: [],
        }

        const sql = generateSQL(graph)

        expect(sql).toContain('serie VARCHAR(40)')
        expect(sql).toContain('numero VARCHAR(40)')
        expect(sql).toContain('PRIMARY KEY (serie, numero)')
        expect(sql).not.toContain('codigo VARCHAR(40)')
    })

    test('a composite connector name should not be emitted in standalone entity SQL', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Cliente',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'internal_direccion_connector',
                            key: true,
                            partialKey: false,
                            children: [
                                {
                                    idMx: '3',
                                    name: 'calle',
                                    key: false,
                                    partialKey: false,
                                },
                                {
                                    idMx: '4',
                                    name: 'ciudad',
                                    key: false,
                                    partialKey: false,
                                },
                            ],
                        },
                    ],
                },
            ],
            relations: [],
        }

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
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Cliente',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'id_cliente',
                            key: true,
                            partialKey: false,
                        },
                        {
                            idMx: '3',
                            name: 'telefono',
                            key: false,
                            partialKey: false,
                            multivalued: true,
                        },
                    ],
                },
            ],
            relations: [],
        }

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE Cliente')
        expect(sql).toContain('id_cliente VARCHAR(40) PRIMARY KEY')

        expect(sql).toContain('CREATE TABLE Cliente_telefono')
        expect(sql).toContain('id_cliente VARCHAR(40)')
        expect(sql).toContain('telefono VARCHAR(40)')
        expect(sql).toContain('PRIMARY KEY (id_cliente, telefono)')

        expect(sql).toContain(
            'id_cliente VARCHAR(40) REFERENCES Cliente(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE',
        )

        expect(sql).not.toContain('telefono VARCHAR(40),\n  PRIMARY KEY')
    })
    
    test('a simple multivalued attribute should reference every column of a composite owner key', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Documento',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'codigo',
                            key: true,
                            partialKey: false,
                            children: [
                                {
                                    idMx: '3',
                                    name: 'serie',
                                    key: false,
                                    partialKey: false,
                                },
                                {
                                    idMx: '4',
                                    name: 'numero',
                                    key: false,
                                    partialKey: false,
                                },
                            ],
                        },
                        {
                            idMx: '5',
                            name: 'etiqueta',
                            key: false,
                            partialKey: false,
                            multivalued: true,
                        },
                    ],
                },
            ],
            relations: [],
        }

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
            'CONSTRAINT FK_Documento_etiqueta_Documento_owner FOREIGN KEY (serie, numero) REFERENCES Documento(serie, numero) ON DELETE CASCADE ON UPDATE CASCADE',
        )
    })
    
    test('a standalone entity should generate a separate table for a composite multivalued attribute', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Cliente',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'id_cliente',
                            key: true,
                            partialKey: false,
                        },
                        {
                            idMx: '3',
                            name: 'telefonos',
                            key: false,
                            partialKey: false,
                            multivalued: true,
                            children: [
                                {
                                    idMx: '4',
                                    name: 'prefijo',
                                    key: false,
                                    partialKey: false,
                                },
                                {
                                    idMx: '5',
                                    name: 'numero',
                                    key: false,
                                    partialKey: false,
                                },
                            ],
                        },
                    ],
                },
            ],
            relations: [],
        }

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
            id_cliente VARCHAR(40) REFERENCES Cliente(id_cliente) ON DELETE CASCADE ON UPDATE CASCADE,
            prefijo VARCHAR(40),
            numero VARCHAR(40),
            PRIMARY KEY (id_cliente, prefijo, numero)
            `,
        )

        expect(sql).not.toContain('telefonos VARCHAR(40)')
    })
})