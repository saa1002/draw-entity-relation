import { describe, expect, test } from "vitest";
import {
    createBinaryRelation,
    createRelationSide,
    createTernaryRelation as createTernaryRelationBuilder
} from "../../helpers/diagramBuilders";
import {
    BINARY_RELATION_SIDE_KEYS,
    canRelationTypeHoldAttributes,
    createEmptyRelationSide,
    createRelationData,
    getRelationArity,
    getRelationCardinalityDisplayValue,
    getRelationEntityIds,
    getRelationSideDisplayName,
    getRelationSideKeys,
    getRelationSideRole,
    getRelationSides,
    isBinaryRelation,
    isManyToManyRelation,
    isRelationConfigured,
    isSelfRelation,
    isTernaryRelation,
    relationHasAllSideIds,
    relationHasBothEntitySides,
    relationInvolvesEntity,
    RELATION_ARITIES,
    resetRelationSides,
    TERNARY_RELATION_SIDE_KEYS,
} from "../../../src/domain/er/relations";

const createTestSide = ({
    idMx = "side-1",
    entityId = "entity-1",
    cardinality = "1:1",
    role = "",
} = {}) =>
    createRelationSide({
        idMx,
        entityId,
        cardinality,
        role,
        cell: "",
        edgeId: "",
    });

const createTestRelation = (overrides = {}) =>
    createBinaryRelation({
        idMx: "relation-1",
        side1: createTestSide({
            idMx: "side-1",
            entityId: "entity-1",
        }),
        side2: createTestSide({
            idMx: "side-2",
            entityId: "entity-2",
        }),
        canHoldAttributes: true,
        ...overrides,
    });

const createTestTernaryRelation = (overrides = {}) =>
    createTernaryRelationBuilder({
        idMx: "relation-1",
        side1: createTestSide({
            idMx: "side-1",
            entityId: "entity-1",
        }),
        side2: createTestSide({
            idMx: "side-2",
            entityId: "entity-2",
        }),
        side3: createTestSide({
            idMx: "side-3",
            entityId: "entity-3",
        }),
        canHoldAttributes: true,
        ...overrides,
    });

describe("Relation participant helpers", () => {
    test("return binary side keys and sides in order", () => {
        const relation = createTestRelation();

        expect(getRelationSideKeys(relation)).toEqual(
            BINARY_RELATION_SIDE_KEYS,
        );
        expect(getRelationSides(relation)).toEqual([
            relation.side1,
            relation.side2,
        ]);
    });

    test("return configured entity ids", () => {
        expect(getRelationEntityIds(createTestRelation())).toEqual([
            "entity-1",
            "entity-2",
        ]);
    });

    test("detect configured binary relations", () => {
        expect(relationHasBothEntitySides(createTestRelation())).toBe(true);
        expect(relationHasAllSideIds(createTestRelation())).toBe(true);
        expect(isRelationConfigured(createTestRelation())).toBe(true);

        expect(
            relationHasBothEntitySides(
                createTestRelation({
                    side2: createTestSide({ idMx: "side-2", entityId: "" }),
                }),
            ),
        ).toBe(false);

        expect(
            relationHasAllSideIds(
                createTestRelation({
                    side2: createTestSide({ idMx: "", entityId: "entity-2" }),
                }),
            ),
        ).toBe(false);

        expect(
            isRelationConfigured(
                createTestRelation({
                    side2: createTestSide({ idMx: "", entityId: "entity-2" }),
                }),
            ),
        ).toBe(false);
    });

    test("detect self relations and entity participation", () => {
        const selfRelation = createTestRelation({
            side2: createTestSide({ idMx: "side-2", entityId: "entity-1" }),
        });

        expect(isSelfRelation(selfRelation)).toBe(true);
        expect(relationInvolvesEntity(selfRelation, "entity-1")).toBe(true);
        expect(relationInvolvesEntity(selfRelation, "entity-3")).toBe(false);
        expect(relationInvolvesEntity(selfRelation, "")).toBe(false);
    });

    test("detect many-to-many relations from side cardinalities", () => {
        expect(
            isManyToManyRelation(
                createTestRelation({
                    side1: createTestSide({ cardinality: "0:N" }),
                    side2: createTestSide({ cardinality: "1:N" }),
                }),
            ),
        ).toBe(true);

        expect(
            isManyToManyRelation(
                createTestRelation({
                    side1: createTestSide({ cardinality: "0:N" }),
                    side2: createTestSide({ cardinality: "1:1" }),
                }),
            ),
        ).toBe(false);
    });

    test("allow attributes on binary many-to-many and ternary relations", () => {
        expect(
            canRelationTypeHoldAttributes(
                createTestRelation({
                    side1: createTestSide({ cardinality: "0:N" }),
                    side2: createTestSide({ cardinality: "1:N" }),
                }),
            ),
        ).toBe(true);

        expect(
            canRelationTypeHoldAttributes(
                createTestRelation({
                    side1: createTestSide({ cardinality: "0:N" }),
                    side2: createTestSide({ cardinality: "1:1" }),
                }),
            ),
        ).toBe(false);

        expect(
            canRelationTypeHoldAttributes(
                createTestTernaryRelation({
                    side1: createTestSide({ cardinality: "0:1" }),
                    side2: createTestSide({ cardinality: "0:1" }),
                    side3: createTestSide({ cardinality: "0:1" }),
                }),
            ),
        ).toBe(true);
    });

    test("display ternary cardinalities as Chen maximum labels", () => {
        const ternaryRelation = createTestTernaryRelation();
        const binaryRelation = createTestRelation();

        expect(
            getRelationCardinalityDisplayValue(ternaryRelation, "0:1"),
        ).toBe("1");
        expect(
            getRelationCardinalityDisplayValue(ternaryRelation, "0:N"),
        ).toBe("N");
        expect(
            getRelationCardinalityDisplayValue(ternaryRelation, "X:X"),
        ).toBe("X:X");
        expect(
            getRelationCardinalityDisplayValue(binaryRelation, "0:N"),
        ).toBe("0:N");
    });

    test("reset binary relation sides through side keys", () => {
        const relation = createTestRelation();

        resetRelationSides(relation, { cardinality: "X:X" });

        expect(relation.side1).toEqual(
            createEmptyRelationSide({ cardinality: "X:X" }),
        );
        expect(relation.side2).toEqual(
            createEmptyRelationSide({ cardinality: "X:X" }),
        );
        expect(relation.canHoldAttributes).toBe(false);
    });

    test("reset ternary relation sides through side keys", () => {
        const relation = createTestTernaryRelation();

        resetRelationSides(relation, { cardinality: "X:X" });

        expect(relation.side1).toEqual(
            createEmptyRelationSide({ cardinality: "X:X" }),
        );
        expect(relation.side2).toEqual(
            createEmptyRelationSide({ cardinality: "X:X" }),
        );
        expect(relation.side3).toEqual(
            createEmptyRelationSide({ cardinality: "X:X" }),
        );
        expect(relation.canHoldAttributes).toBe(false);
    });

    test("treat relations without explicit arity as binary", () => {
        const relation = createTestRelation();

        expect(getRelationArity(relation)).toBe(RELATION_ARITIES.BINARY);
        expect(isBinaryRelation(relation)).toBe(true);
        expect(isTernaryRelation(relation)).toBe(false);
    });

    test("return ternary side keys and sides when arity is ternary", () => {
        const relation = createTestTernaryRelation();

        expect(getRelationArity(relation)).toBe(RELATION_ARITIES.TERNARY);
        expect(isBinaryRelation(relation)).toBe(false);
        expect(isTernaryRelation(relation)).toBe(true);
        expect(getRelationSideKeys(relation)).toEqual(
            TERNARY_RELATION_SIDE_KEYS,
        );
        expect(getRelationSides(relation)).toEqual([
            relation.side1,
            relation.side2,
            relation.side3,
        ]);
    });

    test("return configured entity ids for ternary relations", () => {
        expect(getRelationEntityIds(createTestTernaryRelation())).toEqual([
            "entity-1",
            "entity-2",
            "entity-3",
        ]);
    });

    test("return optional side roles and side display names", () => {
        const relation = createTestTernaryRelation({
            side1: createTestSide({ role: "local player" }),
            side2: createTestSide({ role: "  away player  " }),
            side3: createTestSide({ role: "" }),
        });

        expect(getRelationSideRole(relation.side1)).toBe("local player");
        expect(getRelationSideRole(relation.side2)).toBe("away player");
        expect(
            getRelationSideDisplayName({
                relation,
                sideKey: "side1",
                entityName: "Player",
            }),
        ).toBe("local player");
        expect(
            getRelationSideDisplayName({
                relation,
                sideKey: "side3",
                entityName: "Date",
            }),
        ).toBe("Date");
    });
    
    test("create binary relation data by default", () => {
        const relation = createRelationData({
            idMx: "relation-1",
            name: "Works",
            position: { x: 10, y: 20 },
        });

        expect(relation).toEqual({
            idMx: "relation-1",
            name: "Works",
            position: { x: 10, y: 20 },
            side1: createEmptyRelationSide(),
            side2: createEmptyRelationSide(),
            canHoldAttributes: false,
            isIdentifying: false,
            attributes: [],
        });
    });

    test("create ternary relation data with explicit arity", () => {
        const relation = createRelationData({
            idMx: "relation-1",
            name: "Supplies",
            position: { x: 10, y: 20 },
            arity: RELATION_ARITIES.TERNARY,
        });

        expect(relation).toEqual({
            idMx: "relation-1",
            name: "Supplies",
            position: { x: 10, y: 20 },
            arity: RELATION_ARITIES.TERNARY,
            side1: createEmptyRelationSide(),
            side2: createEmptyRelationSide(),
            side3: createEmptyRelationSide(),
            canHoldAttributes: false,
            isIdentifying: false,
            attributes: [],
        });
    });

    test("ignore unsupported relation arities when creating relation data", () => {
        const relation = createRelationData({
            idMx: "relation-1",
            name: "InvalidArity",
            arity: 4,
        });

        expect(relation).not.toHaveProperty("arity");
        expect(relation).not.toHaveProperty("side3");
        expect(getRelationArity(relation)).toBe(RELATION_ARITIES.BINARY);
    });    
});