import { describe, expect, test } from 'vitest'

import { createAttributeRenderingHelpers, getMultivaluedAttributeDecoratorId, } from '../../../src/components/DiagramEditor/utils/rendering/attributeRendering'

const createCell = (
    id,
    geometry = { x: 0, y: 0, width: 80, height: 40 },
) => ({
    id,
    geometry: { ...geometry },
    setVisible: () => {},
})

const createHelpers = (cells, graphOverrides = {}) => {
    const model = {
        beginUpdate: () => {},
        endUpdate: () => {},
        setTerminal: () => {},
        setStyle: (cell, style) => {
            cell.style = style
        },
    }

    return createAttributeRenderingHelpers({
        graph: {
            getModel: () => model,
            insertVertex: (_parent, id, value, x, y, width, height, style) => {
                const cell = createCell(id, { x, y, width, height })
                cell.value = value
                cell.style = style
                cells[id] = cell
                return cell
            },
            removeCells: () => {},
            refresh: () => {},
            orderCells: () => {},
            ...graphOverrides,
        },
        accessCell: (id) => cells[id] ?? null,
        mxPoint: (x, y) => ({ x, y }),
        mxGeometry: function geometry() {
            this.setTerminalPoint = () => {}
        },
    })
}

describe('attribute rendering helpers', () => {
    test('returns multivalued decorator cells with attribute cells', () => {
        const decoratorId = getMultivaluedAttributeDecoratorId('attr-phones')
        const cells = {
            'attr-phones': createCell('attr-phones'),
            'edge-phones': createCell('edge-phones'),
            [decoratorId]: createCell(decoratorId),
        }

        const helpers = createHelpers(cells)

        const result = helpers.getAttributesCells([
            {
                idMx: 'attr-phones',
                cell: ['attr-phones', 'edge-phones'],
                multivalued: true,
            },
        ])

        expect(result.map((cell) => cell.id)).toEqual([
            'attr-phones',
            'edge-phones',
            decoratorId,
        ])
    })

    test('creates a multivalued decorator when syncing visual representation', () => {
        const decoratorId = getMultivaluedAttributeDecoratorId('attr-phones')
        const cells = {
            'attr-phones': createCell('attr-phones', {
                x: 100,
                y: 120,
                width: 90,
                height: 40,
            }),
        }

        const helpers = createHelpers(cells)

        helpers.syncAttributeVisualRepresentation({
            idMx: 'attr-phones',
            name: 'phones',
            multivalued: true,
        })

        expect(cells[decoratorId]).toMatchObject({
            id: decoratorId,
            geometry: {
                x: 104,
                y: 124,
                width: 82,
                height: 32,
            },
            style: 'multivaluedAttributeDecoratorStyle;shape=ellipse;perimeter=ellipsePerimeter',
        })
    })

    test('syncs multivalued decorator positions from the attribute cell', () => {
        const decoratorId = getMultivaluedAttributeDecoratorId('attr-phones')
        const ownerCell = createCell('entity-1', {
            x: 100,
            y: 100,
            width: 120,
            height: 50,
        })

        const cells = {
            'attr-phones': createCell('attr-phones'),
            [decoratorId]: createCell(decoratorId),
        }

        const helpers = createHelpers(cells)

        helpers.syncOwnerAttributePositions(
            {
                attributes: [
                    {
                        idMx: 'attr-phones',
                        cell: ['attr-phones', 'edge-phones'],
                        offsetX: 80,
                        offsetY: 10,
                        multivalued: true,
                    },
                ],
            },
            ownerCell,
        )

        expect(cells['attr-phones'].geometry.x).toBe(180)
        expect(cells['attr-phones'].geometry.y).toBe(110)

        expect(cells[decoratorId].geometry).toMatchObject({
            x: 184,
            y: 114,
            width: 72,
            height: 32,
        })
    })
    test('returns cells from nested attribute trees', () => {
        const cells = {
            'attr-address': createCell('attr-address'),
            'edge-address': createCell('edge-address'),
            'attr-street': createCell('attr-street'),
            'edge-street': createCell('edge-street'),
        }

        const helpers = createHelpers(cells)

        const result = helpers.getAttributesCells([
            {
                idMx: 'attr-address',
                cell: ['attr-address', 'edge-address'],
                children: [
                    {
                        idMx: 'attr-street',
                        cell: ['attr-street', 'edge-street'],
                    },
                ],
            },
        ])

        expect(result.map((cell) => cell.id)).toEqual([
            'attr-address',
            'edge-address',
            'attr-street',
            'edge-street',
        ])
    })

    test('syncs nested attribute positions from the immediate parent cell', () => {
        const ownerCell = createCell('entity-1', {
            x: 100,
            y: 100,
            width: 120,
            height: 50,
        })

        const cells = {
            'attr-address': createCell('attr-address'),
            'attr-street': createCell('attr-street'),
        }

        const helpers = createHelpers(cells)

        helpers.syncOwnerAttributePositions(
            {
                attributes: [
                    {
                        idMx: 'attr-address',
                        cell: ['attr-address', 'edge-address'],
                        offsetX: 80,
                        offsetY: 10,
                        children: [
                            {
                                idMx: 'attr-street',
                                cell: ['attr-street', 'edge-street'],
                                offsetX: 60,
                                offsetY: 20,
                            },
                        ],
                    },
                ],
            },
            ownerCell,
        )

        expect(cells['attr-address'].geometry.x).toBe(180)
        expect(cells['attr-address'].geometry.y).toBe(110)

        expect(cells['attr-street'].geometry.x).toBe(240)
        expect(cells['attr-street'].geometry.y).toBe(130)
    })
})