import { describe, expect, test } from 'vitest'
import {
    normalizeAttribute,
    normalizeRelationAttribute,
} from '../../../src/domain/er/diagramNormalization'

describe("Nested attribute normalization", () => {
    test("flat attributes should remain unchanged without adding children", () => {
        const attribute = normalizeAttribute({
            idMx: "attr-1",
            name: "name",
        })

        expect(attribute).not.toHaveProperty("children")
    })

    test("entity attributes should preserve multivalued flags", () => {
        const attribute = normalizeAttribute({
            idMx: "attr-1",
            name: "phones",
            multivalued: true,
        })

        expect(attribute).toMatchObject({
            idMx: "attr-1",
            name: "phones",
            multivalued: true,
        })

        expect(attribute).not.toHaveProperty("children")
    })

    test("relation attributes should preserve multivalued flags", () => {
        const attribute = normalizeRelationAttribute({
            idMx: "attr-1",
            name: "phones",
            multivalued: true,
        })

        expect(attribute).toMatchObject({
            idMx: "attr-1",
            name: "phones",
            multivalued: true,
        })

        expect(attribute).not.toHaveProperty("children")
    })

    test("entity attributes should normalize children recursively", () => {
        const attribute = normalizeAttribute({
            idMx: "attr-1",
            name: "address",
            children: [
                {
                    idMx: "attr-2",
                    name: "location",
                    multivalued: true,
                    children: [
                        {
                            idMx: "attr-3",
                            name: "city",
                        },
                    ],
                },
            ],
        })

        expect(attribute.children[0]).toMatchObject({
            idMx: "attr-2",
            name: "location",
            key: false,
            partialKey: false,
            multivalued: true,
        })

        expect(attribute.children[0].children[0]).toMatchObject({
            idMx: "attr-3",
            name: "city",
            key: false,
            partialKey: false,
        })
    })

    test("relation attributes should normalize children recursively", () => {
        const attribute = normalizeRelationAttribute({
            idMx: "attr-1",
            name: "address",
            children: [
                {
                    idMx: "attr-2",
                    name: "location",
                    multivalued: true,
                    children: [
                        {
                            idMx: "attr-3",
                            name: "city",
                        },
                    ],
                },
            ],
        })

        expect(attribute.children[0]).toMatchObject({
            idMx: "attr-2",
            name: "location",
            key: false,
            partialKey: false,
            multivalued: true,
        })

        expect(attribute.children[0].children[0]).toMatchObject({
            idMx: "attr-3",
            name: "city",
            key: false,
            partialKey: false,
        })
    })
})