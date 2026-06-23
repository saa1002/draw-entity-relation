import { describe, expect, test } from 'vitest'
import {
    connectIsaGraphLinks,
    getConfiguredIsaGraphCells,
} from '../../../src/components/DiagramEditor/utils/graph/graphCanvas'
import { createEmptyIsaLink, createIsaData } from '../../../src/domain/er/isa'

const createIsaGraphScenario = () => {
    const cells = {
        'isa-1': { id: 'isa-1' },
        'entity-parent': { id: 'entity-parent' },
        'entity-child-1': { id: 'entity-child-1' },
        'entity-child-2': { id: 'entity-child-2' },
    }

    let edgeCounter = 0

    const graph = {
        insertEdge: (_, id, __, source, target, style) => {
            edgeCounter += 1

            const edge = {
                id: id ?? `edge-${edgeCounter}`,
                source,
                target,
                style,
            }

            cells[edge.id] = edge

            return edge
        },
        orderCells: () => {},
    }

    return {
        graph,
        cells,
    }
}

const createTestIsa = () =>
    createIsaData({
        idMx: 'isa-1',
        generalization: createEmptyIsaLink({
            entityId: 'entity-parent',
        }),
        specializations: [
            createEmptyIsaLink({
                entityId: 'entity-child-1',
            }),
            createEmptyIsaLink({
                entityId: 'entity-child-2',
            }),
        ],
    })

describe('ISA graph canvas helpers', () => {
    test('connects ISA links and stores generated edge ids', () => {
        const { graph, cells } = createIsaGraphScenario()
        const isa = createTestIsa()

        const edges = connectIsaGraphLinks({
            graph,
            isaCell: cells['isa-1'],
            isa,
            generalizationEntityCell: cells['entity-parent'],
            specializationEntityCells: [
                cells['entity-child-1'],
                cells['entity-child-2'],
            ],
        })

        expect(edges).toHaveLength(3)

        expect(isa.generalization.edgeId).toBe('edge-1')
        expect(isa.specializations[0].edgeId).toBe('edge-2')
        expect(isa.specializations[1].edgeId).toBe('edge-3')

        expect(cells['edge-1'].source.id).toBe('isa-1')
        expect(cells['edge-1'].target.id).toBe('entity-parent')
        expect(cells['edge-1'].style).toContain('endArrow=none')

        expect(
            getConfiguredIsaGraphCells({
                isa,
                accessCell: (id) => cells[id],
            }).map((cell) => cell.id),
        ).toEqual(['edge-1', 'edge-2', 'edge-3'])
    })
})