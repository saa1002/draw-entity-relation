import { describe, expect, test, vi } from 'vitest'

import { reconstructDiagramGraph } from '../../../src/components/DiagramEditor/utils/sync/diagramReconstruction'

describe('diagram reconstruction', () => {
    test('reconstructs imported nested attribute trees using the visual parent as edge source', () => {
        const cells = {}

        const graph = {
            insertVertex: vi.fn((_, id, value, x, y, width, height) => {
                const cell = {
                    id,
                    value,
                    geometry: { x, y, width, height },
                }

                cells[id] = cell
                return cell
            }),
            insertEdge: vi.fn((_, id, __, source, target) => {
                const edge = {
                    id,
                    source,
                    target,
                    geometry: {},
                }

                cells[id] = edge
                return edge
            }),
            orderCells: vi.fn(),
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
            mxPoint: vi.fn(),
            createWeakEntityDecorator: vi.fn(),
            ensureDiscriminantUnderline: vi.fn(),
            ensureIdentifyingRelationDecorator: vi.fn(),
            ensureIdentifyingRelationEdgeDecorator: vi.fn(),
        })

        expect(graph.insertVertex).toHaveBeenCalledWith(
            null,
            'attr-street',
            'calle',
            340,
            100,
            expect.any(Number),
            expect.any(Number),
            expect.any(String),
        )

        expect(graph.insertEdge).toHaveBeenCalledWith(
            cells['attr-address'],
            'edge-street',
            null,
            cells['attr-address'],
            cells['attr-street'],
        )
    })
})