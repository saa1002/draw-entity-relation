import { describe, expect, test } from 'vitest'
import {
    findAttributeInTreeById,
    findAttributeNodeInTreeById,
    findAttributeTreeOwnerById,
    ATTRIBUTE_OWNER_TYPES,
    flattenAttributeTree,
    getAttributeChildren,
    getLeafAttributes,
    isCompositeAttribute,
    isLeafAttribute,
    walkAttributeTree,
} from '../../../src/domain/er/attributes'

describe("Hierarchical attribute helpers", () => {
    test("flat attributes should be treated as leaf attributes", () => {
        const attributes = [
            { idMx: "attr-1", name: "name" },
            { idMx: "attr-2", name: "surname" },
        ]

        expect(getLeafAttributes(attributes)).toEqual(attributes)
        expect(isLeafAttribute(attributes[0])).toBe(true)
        expect(isCompositeAttribute(attributes[0])).toBe(false)
        expect(attributes[0]).not.toHaveProperty("children")
    })

    test("attributes with children should be treated as composite attributes", () => {
        const attribute = {
            idMx: "attr-1",
            name: "address",
            children: [
                { idMx: "attr-2", name: "street" },
                { idMx: "attr-3", name: "city" },
            ],
        }

        expect(getAttributeChildren(attribute)).toEqual(attribute.children)
        expect(isCompositeAttribute(attribute)).toBe(true)
        expect(isLeafAttribute(attribute)).toBe(false)
    })

    test("flattenAttributeTree should preserve depth-first traversal order", () => {
        const attributes = [
            {
                idMx: "attr-1",
                name: "address",
                children: [
                    { idMx: "attr-2", name: "street" },
                    { idMx: "attr-3", name: "city" },
                ],
            },
            { idMx: "attr-4", name: "email" },
        ]

        expect(flattenAttributeTree(attributes).map((attribute) => attribute.idMx))
            .toEqual(["attr-1", "attr-2", "attr-3", "attr-4"])
    })

    test("getLeafAttributes should return only leaf attributes from nested trees", () => {
        const attributes = [
            {
                idMx: "attr-1",
                name: "address",
                children: [
                    { idMx: "attr-2", name: "street" },
                    {
                        idMx: "attr-3",
                        name: "location",
                        children: [
                            { idMx: "attr-4", name: "city" },
                        ],
                    },
                ],
            },
            { idMx: "attr-5", name: "email" },
        ]

        expect(getLeafAttributes(attributes).map((attribute) => attribute.idMx))
            .toEqual(["attr-2", "attr-4", "attr-5"])
    })

    test("findAttributeInTreeById should find nested attributes", () => {
        const attributes = [
            {
                idMx: "attr-1",
                name: "address",
                children: [
                    { idMx: "attr-2", name: "street" },
                ],
            },
        ]

        expect(findAttributeInTreeById(attributes, "attr-2")).toEqual(
            attributes[0].children[0],
        )
        expect(findAttributeInTreeById(attributes, "missing")).toBe(null)
    })

    test("walkAttributeTree should expose parent, depth and sibling index", () => {
        const attributes = [
            {
                idMx: "attr-1",
                name: "address",
                children: [
                    { idMx: "attr-2", name: "street" },
                    { idMx: "attr-3", name: "city" },
                ],
            },
            { idMx: "attr-4", name: "email" },
        ]

        const visited = []

        walkAttributeTree(attributes, (attribute, context) => {
            visited.push({
                idMx: attribute.idMx,
                parentId: context.parent?.idMx ?? null,
                depth: context.depth,
                index: context.index,
            })
        })

        expect(visited).toEqual([
            { idMx: "attr-1", parentId: null, depth: 0, index: 0 },
            { idMx: "attr-2", parentId: "attr-1", depth: 1, index: 0 },
            { idMx: "attr-3", parentId: "attr-1", depth: 1, index: 1 },
            { idMx: "attr-4", parentId: null, depth: 0, index: 1 },
        ])
    })

    test("findAttributeNodeInTreeById should return nested attribute context", () => {
        const attributes = [
            {
                idMx: "attr-1",
                name: "address",
                children: [
                    { idMx: "attr-2", name: "street" },
                ],
            },
        ]

        expect(findAttributeNodeInTreeById(attributes, "attr-2")).toMatchObject({
            attribute: attributes[0].children[0],
            parent: attributes[0],
            depth: 1,
            index: 0,
        })
    })

    test("findAttributeTreeOwnerById should return owner and nested attribute context", () => {
        const diagram = {
            entities: [
                {
                    idMx: "entity-1",
                    attributes: [
                        {
                            idMx: "attr-1",
                            children: [
                                { idMx: "attr-2" },
                            ],
                        },
                    ],
                },
            ],
            relations: [],
        }

        expect(findAttributeTreeOwnerById(diagram, "attr-2")).toMatchObject({
            owner: diagram.entities[0],
            ownerType: ATTRIBUTE_OWNER_TYPES.ENTITY,
            attribute: diagram.entities[0].attributes[0].children[0],
            parent: diagram.entities[0].attributes[0],
            depth: 1,
            index: 0,
        })
    })
})

