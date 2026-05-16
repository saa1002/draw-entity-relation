import { describe, expect, test, vi } from 'vitest'

import {
    applyBoundsToCellGeometry,
    buildDecoratorCellId,
    getBaseCellIdFromDecoratorId,
    getInsetBounds,
    isDecoratorCellForSuffix,
    syncVertexDecoratorBounds,
} from '../../../src/components/DiagramEditor/utils/rendering/decoratorRendering'

describe('decorator rendering helpers', () => {
    test('builds and resolves decorator ids from suffixes', () => {
        const suffix = '__decorator'
        const decoratorId = buildDecoratorCellId('entity-1', suffix)

        expect(decoratorId).toBe('entity-1__decorator')
        expect(getBaseCellIdFromDecoratorId(decoratorId, suffix)).toBe(
            'entity-1',
        )
        expect(getBaseCellIdFromDecoratorId('entity-1', suffix)).toBeNull()
    })

    test('detects decorator cells by suffix', () => {
        expect(
            isDecoratorCellForSuffix(
                {
                    id: 'relation-1__decorator',
                },
                '__decorator',
            ),
        ).toBe(true)

        expect(
            isDecoratorCellForSuffix(
                {
                    id: 'relation-1',
                },
                '__decorator',
            ),
        ).toBe(false)
    })

    test('calculates inset bounds with minimum visible size', () => {
        expect(
            getInsetBounds(
                {
                    x: 10,
                    y: 20,
                    width: 6,
                    height: 5,
                },
                4,
            ),
        ).toEqual({
            x: 14,
            y: 24,
            width: 1,
            height: 1,
        })
    })

    test('applies bounds to cell geometry', () => {
        const cell = {
            geometry: {
                x: 0,
                y: 0,
                width: 10,
                height: 10,
            },
        }

        expect(
            applyBoundsToCellGeometry(cell, {
                x: 5,
                y: 6,
                width: 7,
                height: 8,
            }),
        ).toBe(true)

        expect(cell.geometry).toEqual({
            x: 5,
            y: 6,
            width: 7,
            height: 8,
        })
    })

    test('syncs decorator bounds and refreshes the graph', () => {
        const decoratorCell = {
            geometry: {
                x: 0,
                y: 0,
                width: 10,
                height: 10,
            },
        }

        const graph = {
            refresh: vi.fn(),
            orderCells: vi.fn(),
        }

        expect(
            syncVertexDecoratorBounds({
                graph,
                decoratorCell,
                bounds: {
                    x: 1,
                    y: 2,
                    width: 3,
                    height: 4,
                },
            }),
        ).toBe(true)

        expect(decoratorCell.geometry).toEqual({
            x: 1,
            y: 2,
            width: 3,
            height: 4,
        })
        expect(graph.refresh).toHaveBeenCalledWith(decoratorCell)
        expect(graph.orderCells).toHaveBeenCalledWith(false, [decoratorCell])
    })
})