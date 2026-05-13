import { describe, expect, test } from 'vitest'
import {
    addChildAttributeToAttribute,
    createAttribute,
    isCompositeMultivaluedAttribute,
    isMultivaluedAttribute,
    findAttributeInTreeById,
    findAttributeNodeInTreeById,
    findAttributeTreeOwnerById,
    ATTRIBUTE_OWNER_TYPES,
    flattenAttributeTree,
    getAttributeChildren,
    getLeafAttributes,
    isCompositeAttribute,
    isLeafAttribute,
    removeAttributeFromOwnerTreeById,
    removeAttributeFromOwnerTreeByIdWithPromotion,
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

    test("walkAttributeTree should expose parent, depth, sibling index and ancestors", () => {
        const attributes = [
            {
                idMx: "attr-1",
                name: "address",
                children: [
                    {
                        idMx: "attr-2",
                        name: "location",
                        children: [
                            { idMx: "attr-3", name: "city" },
                        ],
                    },
                ],
            },
        ]

        const visited = []

        walkAttributeTree(attributes, (attribute, context) => {
            visited.push({
                idMx: attribute.idMx,
                parentId: context.parent?.idMx ?? null,
                depth: context.depth,
                index: context.index,
                ancestorIds: context.ancestors.map((ancestor) => ancestor.idMx),
            })
        })

        expect(visited).toEqual([
            {
                idMx: "attr-1",
                parentId: null,
                depth: 0,
                index: 0,
                ancestorIds: [],
            },
            {
                idMx: "attr-2",
                parentId: "attr-1",
                depth: 1,
                index: 0,
                ancestorIds: ["attr-1"],
            },
            {
                idMx: "attr-3",
                parentId: "attr-2",
                depth: 2,
                index: 0,
                ancestorIds: ["attr-1", "attr-2"],
            },
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
    test("multivalued attribute helpers should detect multiplicity independently from composition", () => {
        const simpleMultivaluedAttribute = {
            idMx: "attr-1",
            name: "phone",
            multivalued: true,
        }

        const compositeMultivaluedAttribute = {
            idMx: "attr-2",
            name: "address",
            multivalued: true,
            children: [
                { idMx: "attr-3", name: "street" },
            ],
        }

        expect(isMultivaluedAttribute(simpleMultivaluedAttribute)).toBe(true)
        expect(isCompositeMultivaluedAttribute(simpleMultivaluedAttribute)).toBe(false)

        expect(isMultivaluedAttribute(compositeMultivaluedAttribute)).toBe(true)
        expect(isCompositeMultivaluedAttribute(compositeMultivaluedAttribute)).toBe(true)
    })
    test("removeAttributeFromOwnerTreeById should remove nested attributes", () => {
        const owner = {
            attributes: [
                {
                    idMx: "attr-1",
                    name: "address",
                    children: [
                        { idMx: "attr-2", name: "street" },
                        { idMx: "attr-3", name: "city" },
                    ],
                },
                { idMx: "attr-4", name: "email" },
            ],
        }

        const removedAttribute = removeAttributeFromOwnerTreeById(
            owner,
            "attr-2",
        )

        expect(removedAttribute).toEqual({ idMx: "attr-2", name: "street" })
        expect(owner.attributes.map((attribute) => attribute.idMx))
            .toEqual(["attr-3", "attr-4"])
        expect(owner.attributes[0]).toEqual({
            idMx: "attr-3",
            name: "city",
            key: false,
            partialKey: false,
            offsetX: 0,
            offsetY: 0,
        })
    })
    
    test("addChildAttributeToAttribute should initialize children and append the child", () => {
        const parentAttribute = { idMx: "attr-1", name: "address" }
        const childAttribute = { idMx: "attr-2", name: "street" }

        const addedAttribute = addChildAttributeToAttribute(
            parentAttribute,
            childAttribute,
        )

        expect(addedAttribute).toBe(childAttribute)
        expect(parentAttribute.children).toEqual([childAttribute])
    })

    test("removeAttributeFromOwnerTreeById should delete empty children arrays", () => {
        const owner = {
            attributes: [
                {
                    idMx: "attr-1",
                    name: "codigo",
                    children: [
                        {
                            idMx: "attr-2",
                            name: "serie",
                        },
                    ],
                },
            ],
        }

        const removedAttribute = removeAttributeFromOwnerTreeById(
            owner,
            "attr-2",
        )

        expect(removedAttribute).toEqual({
            idMx: "attr-2",
            name: "serie",
        })

        expect(owner.attributes[0]).toEqual({
            idMx: "attr-1",
            name: "codigo",
        })
    })
    test("createAttribute should preserve an enabled multivalued flag", () => {
        const attribute = createAttribute({
            idMx: "attr-1",
            name: "phone",
            position: { x: 10, y: 20 },
            multivalued: true,
            cell: ["attr-1", "edge-1"],
        })

        expect(attribute).toMatchObject({
            idMx: "attr-1",
            name: "phone",
            position: { x: 10, y: 20 },
            key: false,
            partialKey: false,
            multivalued: true,
            cell: ["attr-1", "edge-1"],
            offsetX: 0,
            offsetY: 0,
        })
    })

    test("createAttribute should omit disabled multivalued flags for compatibility", () => {
        const attribute = createAttribute({
            idMx: "attr-1",
            name: "name",
        })

        expect(attribute).not.toHaveProperty("multivalued")
        expect(isMultivaluedAttribute(attribute)).toBe(false)
    })
    
    test("removeAttributeFromOwnerTreeByIdWithPromotion should report promoted attributes", () => {
        const owner = {
            attributes: [
                {
                    idMx: "attr-1",
                    name: "address",
                    children: [
                        { idMx: "attr-2", name: "street" },
                        { idMx: "attr-3", name: "city" },
                    ],
                    cell: ["attr-1", "edge-1"],
                },
            ],
        }

        const result = removeAttributeFromOwnerTreeByIdWithPromotion(
            owner,
            "attr-2",
        )

        expect(result.removedAttribute).toEqual({
            idMx: "attr-2",
            name: "street",
        })
        expect(result.removedCompositeAttribute).toEqual({
            idMx: "attr-1",
            name: "address",
            cell: ["attr-1", "edge-1"],
        })
        expect(result.promotedAttribute).toEqual({
            idMx: "attr-3",
            name: "city",
            key: false,
            partialKey: false,
            offsetX: 0,
            offsetY: 0,
        })
        expect(owner.attributes).toEqual([result.promotedAttribute])
    })

    test("promoted attributes should inherit composite attribute semantics", () => {
        const owner = {
            attributes: [
                {
                    idMx: "attr-1",
                    name: "contact",
                    key: true,
                    partialKey: false,
                    multivalued: true,
                    offsetX: 10,
                    offsetY: 20,
                    children: [
                        { idMx: "attr-2", name: "prefix" },
                        {
                            idMx: "attr-3",
                            name: "number",
                            key: false,
                            partialKey: false,
                            offsetX: 30,
                            offsetY: 40,
                        },
                    ],
                },
            ],
        }

        const result = removeAttributeFromOwnerTreeByIdWithPromotion(
            owner,
            "attr-2",
        )

        expect(result.promotedAttribute).toMatchObject({
            idMx: "attr-3",
            name: "number",
            key: true,
            partialKey: false,
            multivalued: true,
            offsetX: 40,
            offsetY: 60,
        })
    })
})

