import { describe, expect, test } from 'vitest'
import {
    COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE,
    createAttributeRenderingHelpers,
    getAttributeDisplayValue,
    getAttributeRenderDimensions,
    getAttributeStyleString,
    getDiscriminantUnderlineId,
    getMultivaluedAttributeDecoratorId,
} from '../../../src/components/DiagramEditor/utils/rendering/attributeRendering'

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
            insertEdge: (_parent, id, value, source, target, style) => {
                const cell = {
                    id,
                    value,
                    source,
                    target,
                    style,
                    geometry: null,
                }

                cells[id] = cell

                return cell
            },
            removeCells: () => {},
            refresh: () => {},
            orderCells: () => {},
            ...graphOverrides,
        },
        accessCell: (id) => cells[id] ?? null,
        mxPoint: function MxPoint(x, y) {
            this.x = x
            this.y = y
        },
        mxGeometry: function MxGeometry() {
            this.relative = false
            this.points = null
            this.sourcePoint = null
            this.targetPoint = null

            this.setTerminalPoint = function setTerminalPoint(point, isSource) {
                if (isSource) {
                    this.sourcePoint = point
                } else {
                    this.targetPoint = point
                }
            }
        },
        getAttributeDimensions: () => ({
            width: 70,
            height: 34,
        }),
    })
}

describe('Attribute cell collection', () => {
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
})

describe('Attribute position synchronization', () => {
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

describe('Attribute key and discriminant rendering', () => {
    test('propagates primary key rendering to composite attribute leaves', () => {
        const cells = {
            'attr-code': createCell('attr-code'),
            'attr-series': createCell('attr-series'),
            'attr-number': createCell('attr-number'),
        }

        const helpers = createHelpers(cells)

        helpers.syncAttributeVisualRepresentation({
            idMx: 'attr-code',
            name: 'code',
            key: true,
            children: [
                {
                    idMx: 'attr-series',
                    name: 'series',
                },
                {
                    idMx: 'attr-number',
                    name: 'number',
                },
            ],
        })

        expect(cells['attr-code'].style).not.toContain('keyAttrStyle')
        expect(cells['attr-code'].style).toContain('fontSize=0')
        expect(cells['attr-series'].style).toContain('keyAttrStyle')
        expect(cells['attr-number'].style).toContain('keyAttrStyle')
    })

    test('removes inherited primary key rendering from composite attribute leaves', () => {
        const cells = {
            'attr-code': createCell('attr-code'),
            'attr-series': createCell('attr-series'),
        }

        cells['attr-series'].style = 'shape=ellipse;keyAttrStyle'

        const helpers = createHelpers(cells)

        helpers.syncAttributeVisualRepresentation({
            idMx: 'attr-code',
            name: 'code',
            key: false,
            children: [
                {
                    idMx: 'attr-series',
                    name: 'series',
                },
            ],
        })

        expect(cells['attr-code'].style).not.toContain('keyAttrStyle')
        expect(cells['attr-series'].style).not.toContain('keyAttrStyle')
    })

    test('renders composite discriminant attributes on every visible child', () => {
        const rootUnderlineId = getDiscriminantUnderlineId('attr-code')
        const firstChildUnderlineId = getDiscriminantUnderlineId('attr-series')
        const secondChildUnderlineId = getDiscriminantUnderlineId('attr-number')

        const cells = {
            'attr-code': createCell('attr-code', {
                x: 100,
                y: 120,
                width: 90,
                height: 40,
            }),
            'attr-series': createCell('attr-series', {
                x: 220,
                y: 100,
                width: 90,
                height: 40,
            }),
            'attr-number': createCell('attr-number', {
                x: 220,
                y: 160,
                width: 90,
                height: 40,
            }),
        }

        const helpers = createHelpers(cells)

        helpers.syncAttributeVisualRepresentation({
            idMx: 'attr-code',
            name: 'code',
            partialKey: true,
            children: [
                {
                    idMx: 'attr-series',
                    name: 'series',
                },
                {
                    idMx: 'attr-number',
                    name: 'number',
                },
            ],
        })

        expect(cells[rootUnderlineId]).toBeUndefined()

        expect(cells[firstChildUnderlineId]).toMatchObject({
            id: firstChildUnderlineId,
            style: expect.stringContaining('dashed=1'),
        })

        expect(cells[secondChildUnderlineId]).toMatchObject({
            id: secondChildUnderlineId,
            style: expect.stringContaining('dashed=1'),
        })
    })
})

describe('Attribute display and dimensions', () => {
    test('composite attributes should render as branch connectors without labels', () => {
        const attribute = {
            idMx: 'attr-address',
            name: 'address',
            children: [
                {
                    idMx: 'attr-street',
                    name: 'street',
                },
            ],
        }

        expect(getAttributeDisplayValue(attribute)).toBe('')

        expect(
            getAttributeRenderDimensions(attribute, () => ({
                width: 100,
                height: 40,
            })),
        ).toEqual({
            width: COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE,
            height: COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE,
        })

        expect(getAttributeStyleString(attribute)).toContain('fontSize=0')
        expect(getAttributeStyleString(attribute)).not.toContain('keyAttrStyle')
    })

    test('simple attributes should keep their visible label and normal dimensions', () => {
        const attribute = {
            idMx: 'attr-name',
            name: 'name',
        }

        expect(getAttributeDisplayValue(attribute)).toBe('name')

        expect(
            getAttributeRenderDimensions(attribute, () => ({
                width: 100,
                height: 40,
            })),
        ).toEqual({
            width: 100,
            height: 40,
        })
    })

    test('syncs composite attributes as small unlabeled connector cells', () => {
        const cells = {
            'attr-address': createCell('attr-address', {
                x: 100,
                y: 120,
                width: 90,
                height: 40,
            }),
            'attr-street': createCell('attr-street'),
        }

        const helpers = createHelpers(cells)

        helpers.syncAttributeVisualRepresentation({
            idMx: 'attr-address',
            name: 'address',
            children: [
                {
                    idMx: 'attr-street',
                    name: 'street',
                },
            ],
        })

        expect(cells['attr-address'].value).toBe('')
        expect(cells['attr-address'].geometry).toMatchObject({
            x: 100 + (90 - COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE) / 2,
            y: 120 + (40 - COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE) / 2,
            width: COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE,
            height: COMPOSITE_ATTRIBUTE_CONNECTOR_SIZE,
        })
        expect(cells['attr-address'].style).toContain('fontSize=0')
    })
})

describe('Multivalued attribute rendering', () => {
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

        expect(cells['attr-phones'].geometry).toMatchObject({
            x: 110,
            y: 123,
            width: 70,
            height: 34,
        })

        expect(cells[decoratorId]).toMatchObject({
            id: decoratorId,
            geometry: {
                x: 114,
                y: 127,
                width: 62,
                height: 26,
            },
            style: 'multivaluedAttributeDecoratorStyle;shape=ellipse;perimeter=ellipsePerimeter;pointerEvents=0',
        })
    })

    test('renders composite multivalued attributes on every visible child', () => {
        const rootDecoratorId =
            getMultivaluedAttributeDecoratorId('attr-contact')
        const firstChildDecoratorId = getMultivaluedAttributeDecoratorId(
            'attr-contact-label',
        )
        const secondChildDecoratorId =
            getMultivaluedAttributeDecoratorId('attr-number')

        const cells = {
            'attr-contact': createCell('attr-contact', {
                x: 100,
                y: 120,
                width: 90,
                height: 40,
            }),
            'attr-contact-label': createCell('attr-contact-label', {
                x: 220,
                y: 100,
                width: 90,
                height: 40,
            }),
            'attr-number': createCell('attr-number', {
                x: 220,
                y: 160,
                width: 90,
                height: 40,
            }),
        }

        const helpers = createHelpers(cells)

        helpers.syncAttributeVisualRepresentation({
            idMx: 'attr-contact',
            name: 'contact',
            multivalued: true,
            children: [
                {
                    idMx: 'attr-contact-label',
                    name: 'contact',
                },
                {
                    idMx: 'attr-number',
                    name: 'number',
                },
            ],
        })

        expect(cells[rootDecoratorId]).toBeUndefined()

        expect(cells[firstChildDecoratorId]).toMatchObject({
            id: firstChildDecoratorId,
            style: 'multivaluedAttributeDecoratorStyle;shape=ellipse;perimeter=ellipsePerimeter;pointerEvents=0',
        })

        expect(cells[secondChildDecoratorId]).toMatchObject({
            id: secondChildDecoratorId,
            style: 'multivaluedAttributeDecoratorStyle;shape=ellipse;perimeter=ellipsePerimeter;pointerEvents=0',
        })
    })
})