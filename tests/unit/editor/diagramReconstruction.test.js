import { describe, expect, test } from 'vitest'

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

    test('reconstructs ISA triangle vertices', () => {
        const cells = {}

        const graph = {
            insertVertex: (_, id, value, x, y, width, height, style) => {
                const cell = {
                    id,
                    value,
                    geometry: { x, y, width, height },
                    style,
                }

                cells[id] = cell
                return cell
            },
            insertEdge: () => {},
            orderCells: () => {},
        }

        const diagram = {
            entities: [],
            relations: [],
            isas: [
                {
                    idMx: 'isa-1',
                    position: { x: 120, y: 160 },
                    generalization: {
                        edgeId: '',
                        entity: { idMx: '' },
                    },
                    specializations: [],
                },
            ],
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

        expect(cells['isa-1']).toMatchObject({
            id: 'isa-1',
            value: 'ISA',
            geometry: {
                x: 120,
                y: 160,
                width: 70,
                height: 55,
            },
        })

        expect(cells['isa-1'].style).toContain('shape=triangle')
        expect(cells['isa-1'].style).toContain('direction=south')
    })

    test("reconstructs configured ISA hierarchy links", () => {
        const cells = {};
        const insertedEdges = [];

        const graph = {
            insertVertex: (_, id, value, x, y, width, height, style) => {
                const cell = {
                    id,
                    value,
                    geometry: { x, y, width, height },
                    style,
                };

                cells[id] = cell;
                return cell;
            },
            insertEdge: (_, id, __, source, target, style) => {
                const edge = {
                    id,
                    source,
                    target,
                    style,
                };

                cells[id] = edge;
                insertedEdges.push(edge);
                return edge;
            },
            orderCells: () => {},
        };

        const diagram = {
            entities: [
                {
                    idMx: "entity-parent",
                    name: "Persona",
                    position: { x: 100, y: 80 },
                    attributes: [],
                },
                {
                    idMx: "entity-child",
                    name: "Alumno",
                    position: { x: 100, y: 220 },
                    attributes: [],
                },
            ],
            relations: [],
            isas: [
                {
                    idMx: "isa-1",
                    position: { x: 110, y: 150 },
                    generalization: {
                        edgeId: "edge-parent",
                        entity: { idMx: "entity-parent" },
                    },
                    specializations: [
                        {
                            edgeId: "edge-child",
                            entity: { idMx: "entity-child" },
                        },
                    ],
                },
            ],
        };

        reconstructDiagramGraph({
            graph,
            diagram,
            accessCell: (id) => cells[id],
            mxPoint: (x, y) => ({ x, y }),
            createWeakEntityDecorator: () => {},
            ensureDiscriminantUnderline: () => {},
            ensureMultivaluedAttributeDecorator: () => {},
            ensureIdentifyingRelationDecorator: () => {},
            ensureIdentifyingRelationEdgeDecorator: () => {},
        });

        expect(insertedEdges).toHaveLength(2);

        expect(cells["edge-parent"]).toMatchObject({
            id: "edge-parent",
            source: cells["isa-1"],
            target: cells["entity-parent"],
        });

        expect(cells["edge-child"]).toMatchObject({
            id: "edge-child",
            source: cells["isa-1"],
            target: cells["entity-child"],
        });

        expect(cells["edge-parent"].style).toContain("endArrow=none");
    });
})