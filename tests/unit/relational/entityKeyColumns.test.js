import { describe, expect, test } from 'vitest'
import {
    getEntityPrimaryKeyColumnNamesIgnoringCycles,
    getEntityPrimaryKeyColumnReferences,
} from '../../../src/domain/relational/entityKeyColumns'

const createCascadedWeakGraph = () => ({
    entities: [
        {
            idMx: 'entity-0',
            name: 'Pedido',
            weak: false,
            attributes: [
                {
                    idMx: 'attr-0',
                    name: 'id_pedido',
                    key: true,
                    partialKey: false,
                },
            ],
        },
        {
            idMx: 'entity-1',
            name: 'LineaPedido',
            weak: true,
            ownerEntityId: 'entity-0',
            attributes: [
                {
                    idMx: 'attr-1',
                    name: 'numero_linea',
                    key: false,
                    partialKey: true,
                },
            ],
        },
        {
            idMx: 'entity-2',
            name: 'DetalleLinea',
            weak: true,
            ownerEntityId: 'entity-1',
            attributes: [
                {
                    idMx: 'attr-2',
                    name: 'secuencia',
                    key: false,
                    partialKey: true,
                },
            ],
        },
    ],
    relations: [],
})

describe('Entity primary key column references', () => {
    test('resolves strong entity primary key columns', () => {
        const graph = createCascadedWeakGraph()

        expect(
            getEntityPrimaryKeyColumnReferences(graph.entities[0], graph),
        ).toEqual([
            {
                name: 'id_pedido',
                referencedColumn: 'id_pedido',
            },
        ])
    })

    test('resolves cascaded weak entity primary key columns', () => {
        const graph = createCascadedWeakGraph()

        expect(
            getEntityPrimaryKeyColumnReferences(graph.entities[2], graph),
        ).toEqual([
            {
                name: 'secuencia',
                referencedColumn: 'secuencia',
            },
            {
                name: 'numero_linea_LineaPedido',
                referencedColumn: 'numero_linea_LineaPedido',
            },
            {
                name: 'id_pedido_Pedido_LineaPedido',
                referencedColumn: 'id_pedido_Pedido_LineaPedido',
            },
        ])
    })

    test('can return names without throwing on weak ownership cycles for validation', () => {
        const graph = createCascadedWeakGraph()
        graph.entities[1].ownerEntityId = graph.entities[2].idMx

        expect(
            getEntityPrimaryKeyColumnNamesIgnoringCycles(
                graph.entities[1],
                graph,
            ),
        ).toEqual(['numero_linea', 'secuencia_DetalleLinea'])
    })

    test('throws on weak ownership cycles when SQL needs concrete references', () => {
        const graph = createCascadedWeakGraph()
        graph.entities[1].ownerEntityId = graph.entities[2].idMx

        expect(() =>
            getEntityPrimaryKeyColumnReferences(graph.entities[1], graph),
        ).toThrow(
            'Cannot resolve primary key columns for weak entity "LineaPedido"',
        )
    })
})