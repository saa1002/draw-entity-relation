import { describe, expect, test } from 'vitest'
import {
    normalizeAttribute,
    normalizeRelationAttribute,
} from '../../../src/domain/er/diagramNormalization'

describe("Nested attribute normalization", () => {
    test("Flat attributes should remain unchanged without adding children", () => {
        const attribute = normalizeAttribute({
            idMx: "attr-1",
            name: "name",
        })

        expect(attribute).not.toHaveProperty("children")
    })

    test.each([
        ["entity", normalizeAttribute],
        ["relation", normalizeRelationAttribute],
    ])("%s attributes should normalize children recursively", (_, normalize) => {
        const attribute = normalize({
            idMx: "attr-1",
            name: "address",
            children: [
                {
                    idMx: "attr-2",
                    name: "location",
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
        })

        expect(attribute.children[0].children[0]).toMatchObject({
            idMx: "attr-3",
            name: "city",
            key: false,
            partialKey: false,
        })
    })
})