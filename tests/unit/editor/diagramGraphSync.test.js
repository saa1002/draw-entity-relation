import { describe, expect, test } from 'vitest'

import { syncDiagramDataFromGraph } from '../../../src/components/DiagramEditor/utils/sync/diagramGraphSync'
import { updateAttributePosition } from '../../../src/domain/er'

const createVertex = (id, value, x, y) => ({
    id,
    value,
    geometry: { x, y },
})

const createEdge = (id, source, target) => ({
    id,
    source,
    target,
})

describe('diagram graph sync', () => {
    test('syncs nested attributes using their immediate parent as offset reference', () => {
        const cells = {}

        cells['entity-1'] = createVertex('entity-1', 'Persona', 100, 100)
        cells['attr-address'] = createVertex(
            'attr-address',
            'direccion',
            220,
            120,
        )
        cells['attr-street'] = createVertex('attr-street', 'calle', 300, 150)

        cells['edge-address'] = createEdge(
            'edge-address',
            cells['entity-1'],
            cells['attr-address'],
        )

        cells['edge-street'] = createEdge(
            'edge-street',
            cells['attr-address'],
            cells['attr-street'],
        )

        const diagram = {
            entities: [
                {
                    idMx: 'entity-1',
                    name: 'OldPersona',
                    position: { x: 0, y: 0 },
                    attributes: [
                        {
                            idMx: 'attr-address',
                            name: 'oldAddress',
                            position: { x: 0, y: 0 },
                            cell: ['attr-address', 'edge-address'],
                            offsetX: 0,
                            offsetY: 0,
                            children: [
                                {
                                    idMx: 'attr-street',
                                    name: 'oldStreet',
                                    position: { x: 0, y: 0 },
                                    cell: ['attr-street', 'edge-street'],
                                    offsetX: 0,
                                    offsetY: 0,
                                },
                            ],
                        },
                    ],
                },
            ],
            relations: [],
        }

        syncDiagramDataFromGraph({
            diagram,
            graph: {
                model: { cells },
                getEdges: (cell) =>
                    Object.values(cells).filter(
                        (candidate) =>
                            candidate.source === cell ||
                            candidate.target === cell,
                    ),
            },
            accessCell: (id) => cells[id],
            updateAttributePosition,
        })

        const address = diagram.entities[0].attributes[0]
        const street = address.children[0]

        expect(address.name).toBe('direccion')
        expect(address.position).toEqual({ x: 220, y: 120 })
        expect(address.offsetX).toBe(120)
        expect(address.offsetY).toBe(20)

        expect(street.name).toBe('calle')
        expect(street.position).toEqual({ x: 300, y: 150 })
        expect(street.offsetX).toBe(80)
        expect(street.offsetY).toBe(30)
    })
    test('syncs ISA position from graph', () => {
        const cells = {
            'isa-1': createVertex('isa-1', 'ISA', 240, 180),
        }

        const diagram = {
            entities: [],
            relations: [],
            isas: [
                {
                    idMx: 'isa-1',
                    position: { x: 0, y: 0 },
                    generalization: {
                        edgeId: '',
                        entity: { idMx: '' },
                    },
                    specializations: [],
                },
            ],
        }

        syncDiagramDataFromGraph({
            diagram,
            graph: {
                model: { cells },
                getEdges: () => [],
            },
            accessCell: (id) => cells[id],
            updateAttributePosition,
        })

        expect(diagram.isas[0].position).toEqual({ x: 240, y: 180 })
    })
})