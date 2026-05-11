import { describe, expect, test, vi } from 'vitest'

import { reconstructDiagramGraph } from '../../../src/components/DiagramEditor/utils/sync/diagramReconstruction'

describe('diagram reconstruction', () => {
    test('reconstructs a nested attribute connected to its parent attribute', () => {
        const cells = {}
        const insertedEdges = []

        const graph = {
            insertVertex: (_, id, value, x, y, width, height) => {
                const cell = {
                    id,
                    value,
                    geometry: { x, y, width, height },
                }

                cells[id] = cell
                return cell
            },
            insertEdge: (_, id, __, source, target) => {
                const edge = {
                    id,
                    source,
                    target,
                    geometry: {},
                }

                cells[id] = edge
                insertedEdges.push(edge)
                return edge
            },
            orderCells: () => {},
        }

        const diagram = {
            entities: [
                {
                    idMx: 'entity-1',
                    name: 'Persona',
                    position: { x: 100, y: 100 },
                    attributes: [
                        {
                            idMx: 'attr-address',
                            name: 'direccion',
                            position: { x: 220, y: 100 },
                            key: false,
                            partialKey: false,
                            cell: ['attr-address', 'edge-address'],
                            offsetX: 120,
                            offsetY: 0,
                            children: [
                                {
                                    idMx: 'attr-street',
                                    name: 'calle',
                                    position: { x: 340, y: 100 },
                                    key: false,
                                    partialKey: false,
                                    cell: ['attr-street', 'edge-street'],
                                    offsetX: 120,
                                    offsetY: 0,
                                },
                            ],
                        },
                    ],
                },
            ],
            relations: [],
        }

        reconstructDiagramGraph({
            graph,
            diagram,
            accessCell: (id) => cells[id],
            mxPoint: (x, y) => ({ x, y }),
            createWeakEntityDecorator: () => {},
            ensureDiscriminantUnderline: () => {},
            ensureIdentifyingRelationDecorator: () => {},
            ensureIdentifyingRelationEdgeDecorator: () => {},
        })

        const childEdge = insertedEdges.find((edge) => edge.id === 'edge-street')

        expect(childEdge.source.id).toBe('attr-address')
        expect(childEdge.target.id).toBe('attr-street')
    })
})