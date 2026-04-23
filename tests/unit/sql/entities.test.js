import { describe, expect, test } from 'vitest'
import { generateSQL } from '../../../src/utils/sql'

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
})