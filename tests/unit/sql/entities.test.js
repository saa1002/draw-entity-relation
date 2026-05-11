import { describe, expect, test } from 'vitest'
import { generateSQL } from '../../../src/services/sql'

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
        expect(sql).toContain('direccion_calle VARCHAR(40)')
        expect(sql).toContain('direccion_ciudad VARCHAR(40)')
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

        expect(sql).toContain('codigo_serie VARCHAR(40)')
        expect(sql).toContain('codigo_numero VARCHAR(40)')
        expect(sql).toContain('PRIMARY KEY (codigo_serie, codigo_numero)')
        expect(sql).not.toContain('codigo VARCHAR(40)')
    })
})