import { beforeEach, describe, expect, test } from 'vitest'
import { createAttribute } from '../../helpers/diagramBuilders'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    emptyCompositeAttributes,
    nestedCompositeAttributes,
    nmRelationsWithPK,
    repeatedAttributesInEntity,
    unsupportedMultivaluedAttributes,
    validateGraph,
} from '../../../src/domain/er/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe('Attribute name uniqueness', () => {
    test('entities with unique attribute names should be valid', () => {
        expect(repeatedAttributesInEntity(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noRepeatedAttrNames).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test("entities can't have repeated attribute names", () => {
        expect(repeatedAttributesInEntity(graph)).toBe(false)

        graph.entities.at(0).attributes.at(1).name =
            graph.entities.at(0).attributes.at(0).name

        expect(repeatedAttributesInEntity(graph)).toBe(true)
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(false)
    })

    test("N:M relations can't have repeated attribute names", () => {
        expect(repeatedAttributesInEntity(graph)).toBe(false)

        graph.relations.at(0).attributes.at(1).name =
            graph.relations.at(0).attributes.at(0).name

        expect(repeatedAttributesInEntity(graph)).toBe(true)
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(false)
    })

    test("composite attributes can't have repeated sibling attribute names", () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-composite',
                name: 'direccion',
                children: [
                    createAttribute({
                        idMx: 'attr-street-1',
                        name: 'calle',
                    }),
                    createAttribute({
                        idMx: 'attr-street-2',
                        name: 'calle',
                    }),
                ],
            }),
        )

        expect(repeatedAttributesInEntity(graph)).toBe(true)
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(false)
    })

    test('attributes in different composite branches may reuse the same leaf name', () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-address',
                name: 'direccion',
                children: [
                    createAttribute({
                        idMx: 'attr-address-street',
                        name: 'calle',
                    }),
                ],
            }),
            createAttribute({
                idMx: 'attr-billing-address',
                name: 'direccion_facturacion',
                children: [
                    createAttribute({
                        idMx: 'attr-billing-street',
                        name: 'calle',
                    }),
                ],
            }),
        )

        expect(repeatedAttributesInEntity(graph)).toBe(false)
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(true)
    })

    test('relations that cannot hold attributes are ignored when checking repeated attribute names', () => {
        graph.relations.at(0).canHoldAttributes = false
        graph.relations.at(0).attributes = [
            createAttribute({
                idMx: 'attr-relation-1',
                name: 'fecha',
            }),
            createAttribute({
                idMx: 'attr-relation-2',
                name: 'fecha',
            }),
        ]

        expect(repeatedAttributesInEntity(graph)).toBe(false)
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(true)
    })
})

describe('N:M relation attribute constraints', () => {
    test('an N:M relation without primary key attributes should be valid', () => {
        expect(nmRelationsWithPK(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noNMRelationsWithPK).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test("N:M relations can't have primary key attributes", () => {
        expect(nmRelationsWithPK(graph)).toBe(false)

        graph.relations.at(0).attributes.at(0).key = true

        expect(nmRelationsWithPK(graph)).toBe(true)
        expect(validateGraph(graph).noNMRelationsWithPK).toBe(false)
    })

    test("N:M relations can't have nested primary key attributes", () => {
        expect(nmRelationsWithPK(graph)).toBe(false)

        graph.relations.at(0).attributes = [
            createAttribute({
                idMx: 'attr-composite',
                name: 'periodo',
                children: [
                    createAttribute({
                        idMx: 'attr-nested-key',
                        name: 'id',
                        key: true,
                    }),
                ],
            }),
        ]

        expect(nmRelationsWithPK(graph)).toBe(true)
        expect(validateGraph(graph).noNMRelationsWithPK).toBe(false)
    })
})

describe('Composite attribute structure', () => {
    test('explicit empty composite attributes should be invalid', () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-empty-composite',
                name: 'direccion',
                children: [],
            }),
        )

        expect(emptyCompositeAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noEmptyCompositeAttributes).toBe(false)
    })

    test('nested explicit empty composite attributes should be invalid', () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-composite',
                name: 'direccion',
                children: [
                    createAttribute({
                        idMx: 'attr-empty-nested-composite',
                        name: 'ubicacion',
                        children: [],
                    }),
                ],
            }),
        )

        expect(emptyCompositeAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noEmptyCompositeAttributes).toBe(false)
    })

    test("composite attributes can't contain nested composite attributes", () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-address',
                name: 'direccion',
                children: [
                    createAttribute({
                        idMx: 'attr-location',
                        name: 'ubicacion',
                        children: [
                            createAttribute({
                                idMx: 'attr-city',
                                name: 'ciudad',
                            }),
                        ],
                    }),
                ],
            }),
        )

        expect(nestedCompositeAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noNestedCompositeAttributes).toBe(false)
    })

    test('relations that cannot hold attributes are ignored when checking empty composite attributes', () => {
        graph.relations.at(0).canHoldAttributes = false
        graph.relations.at(0).attributes = [
            createAttribute({
                idMx: 'attr-empty-composite-relation',
                name: 'periodo',
                children: [],
            }),
        ]

        expect(emptyCompositeAttributes(graph)).toBe(false)
        expect(validateGraph(graph).noEmptyCompositeAttributes).toBe(true)
    })
})

describe('Multivalued attribute constraints', () => {
    test('simple entity multivalued attributes should be valid', () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-phones',
                name: 'telefonos',
                multivalued: true,
            }),
        )

        expect(unsupportedMultivaluedAttributes(graph)).toBe(false)
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            true,
        )
    })

    test("primary key attributes can't be multivalued", () => {
        graph.entities.at(0).attributes.at(0).multivalued = true

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        )
    })

    test("partial key attributes can't be multivalued", () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-partial',
                name: 'codigo',
                partialKey: true,
                multivalued: true,
            }),
        )

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        )
    })

    test('top-level composite entity multivalued attributes should be valid', () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-contact',
                name: 'contacto',
                multivalued: true,
                children: [
                    createAttribute({
                        idMx: 'attr-phone',
                        name: 'telefono',
                    }),
                ],
            }),
        )

        expect(unsupportedMultivaluedAttributes(graph)).toBe(false)
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            true,
        )
    })

    test('primary key leaves inside composite multivalued attributes are unsupported', () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-contact',
                name: 'contacto',
                multivalued: true,
                children: [
                    createAttribute({
                        idMx: 'attr-phone',
                        name: 'telefono',
                        key: true,
                    }),
                ],
            }),
        )

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        )
    })

    test('partial key leaves inside composite multivalued attributes are unsupported', () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-contact',
                name: 'contacto',
                multivalued: true,
                children: [
                    createAttribute({
                        idMx: 'attr-phone',
                        name: 'telefono',
                        partialKey: true,
                    }),
                ],
            }),
        )

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        )
    })

    test("nested attributes can't be multivalued yet", () => {
        graph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-contact',
                name: 'contacto',
                children: [
                    createAttribute({
                        idMx: 'attr-phone',
                        name: 'telefono',
                        multivalued: true,
                    }),
                ],
            }),
        )

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        )
    })

    test("relation attributes can't be multivalued yet", () => {
        graph.relations.at(0).attributes.at(0).multivalued = true

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true)
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        )
    })
})