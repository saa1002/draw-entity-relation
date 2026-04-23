import { describe, expect, test } from 'vitest'
import { generateSQL } from '../../../src/utils/sql'

describe('Weak entity SQL generation', () => {
    test('a weak entity should generate a composite primary key with owner key and partial key', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Pedido',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'id_pedido',
                            key: true,
                            partialKey: false,
                        },
                    ],
                },
                {
                    idMx: '3',
                    name: 'LineaPedido',
                    weak: true,
                    ownerEntityId: '1',
                    identifyingRelationId: '4',
                    attributes: [
                        {
                            idMx: '5',
                            name: 'numero_linea',
                            key: false,
                            partialKey: true,
                        },
                        {
                            idMx: '6',
                            name: 'cantidad',
                            key: false,
                            partialKey: false,
                        },
                    ],
                },
            ],
            relations: [
                {
                    idMx: '4',
                    name: 'Identifica',
                    isIdentifying: true,
                    attributes: [],
                    side1: {
                        cardinality: '1:N',
                        entity: { idMx: '3' },
                    },
                    side2: {
                        cardinality: '1:1',
                        entity: { idMx: '1' },
                    },
                },
            ],
        }

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE LineaPedido')
        expect(sql).toContain('numero_linea VARCHAR(40)')
        expect(sql).toContain('id_pedido_Pedido VARCHAR(40)')
        expect(sql).toContain('PRIMARY KEY (numero_linea, id_pedido_Pedido)')
        expect(sql).toContain(
            'FOREIGN KEY (id_pedido_Pedido) REFERENCES Pedido(id_pedido)'
        )
        expect(sql).toContain('cantidad VARCHAR(40)')
    })
    
    test('an identifying relation should not generate a standalone table', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Pedido',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'id_pedido',
                            key: true,
                            partialKey: false,
                        },
                    ],
                },
                {
                    idMx: '3',
                    name: 'LineaPedido',
                    weak: true,
                    ownerEntityId: '1',
                    identifyingRelationId: '4',
                    attributes: [
                        {
                            idMx: '5',
                            name: 'numero_linea',
                            key: false,
                            partialKey: true,
                        },
                    ],
                },
            ],
            relations: [
                {
                    idMx: '4',
                    name: 'Identifica',
                    isIdentifying: true,
                    attributes: [],
                    side1: {
                        cardinality: '1:N',
                        entity: { idMx: '3' },
                    },
                    side2: {
                        cardinality: '1:1',
                        entity: { idMx: '1' },
                    },
                },
            ],
        }

        const sql = generateSQL(graph)

        expect(sql).not.toContain('CREATE TABLE Identifica')
    })
})