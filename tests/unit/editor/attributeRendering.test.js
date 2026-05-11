import { describe, expect, test } from 'vitest'

import { createAttributeRenderingHelpers } from '../../../src/components/DiagramEditor/utils/rendering/attributeRendering'

const createCell = (
    id,
    geometry = { x: 0, y: 0, width: 80, height: 40 },
) => ({
    id,
    geometry: { ...geometry },
    setVisible: () => {},
})

const createHelpers = (cells) =>
    createAttributeRenderingHelpers({
        graph: {
            getModel: () => ({
                beginUpdate: () => {},
                endUpdate: () => {},
                setTerminal: () => {},
            }),
            removeCells: () => {},
            refresh: () => {},
            orderCells: () => {},
        },
        accessCell: (id) => cells[id] ?? null,
        mxPoint: (x, y) => ({ x, y }),
        mxGeometry: function geometry() {
            this.setTerminalPoint = () => {}
        },
    })

describe('attribute rendering helpers', () => {
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