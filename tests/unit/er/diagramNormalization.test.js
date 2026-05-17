import { describe, expect, test } from 'vitest'
import {
    normalizeAttribute,
    normalizeRelation,
    normalizeRelationAttribute,
} from '../../../src/domain/er/diagramNormalization'
import { RELATION_ARITIES } from '../../../src/domain/er/relations'

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

describe("Relation normalization", () => {
    const createSide = ({
        idMx = "side-1",
        entityId = "entity-1",
        cardinality = "1:1",
    } = {}) => ({
        idMx,
        cardinality,
        cell: idMx,
        edgeId: `edge-${idMx}`,
        entity: { idMx: entityId },
    })

    test("keeps binary relations backward compatible without explicit arity", () => {
        const relation = normalizeRelation({
            idMx: "relation-1",
            name: "Works",
            side1: createSide({ idMx: "side-1", entityId: "entity-1" }),
            side2: createSide({ idMx: "side-2", entityId: "entity-2" }),
            side3: createSide({ idMx: "side-3", entityId: "entity-3" }),
        })

        expect(relation).not.toHaveProperty("arity")
        expect(relation).not.toHaveProperty("side3")
        expect(relation.side1.entity.idMx).toBe("entity-1")
        expect(relation.side2.entity.idMx).toBe("entity-2")
    })

    test("normalizes ternary relations with explicit third side", () => {
        const relation = normalizeRelation({
            idMx: "relation-1",
            name: "Supplies",
            arity: RELATION_ARITIES.TERNARY,
            side1: createSide({ idMx: "side-1", entityId: "entity-1" }),
            side2: createSide({ idMx: "side-2", entityId: "entity-2" }),
            side3: createSide({ idMx: "side-3", entityId: "entity-3" }),
        })

        expect(relation.arity).toBe(RELATION_ARITIES.TERNARY)
        expect(relation.side1.entity.idMx).toBe("entity-1")
        expect(relation.side2.entity.idMx).toBe("entity-2")
        expect(relation.side3.entity.idMx).toBe("entity-3")
    })

    test("falls back to binary relation shape for unsupported arities", () => {
        const relation = normalizeRelation({
            idMx: "relation-1",
            name: "InvalidArity",
            arity: 4,
            side1: createSide({ idMx: "side-1", entityId: "entity-1" }),
            side2: createSide({ idMx: "side-2", entityId: "entity-2" }),
            side3: createSide({ idMx: "side-3", entityId: "entity-3" }),
        })

        expect(relation).not.toHaveProperty("arity")
        expect(relation).not.toHaveProperty("side3")
        expect(relation.side1.entity.idMx).toBe("entity-1")
        expect(relation.side2.entity.idMx).toBe("entity-2")
    })
})