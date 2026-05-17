import { describe, expect, test } from "vitest";
import {
    BINARY_RELATION_SIDE_KEYS,
    createEmptyRelationSide,
    getRelationEntityIds,
    getRelationSideKeys,
    getRelationSides,
    isManyToManyRelation,
    isRelationConfigured,
    isSelfRelation,
    relationHasAllSideIds,
    relationHasBothEntitySides,
    relationInvolvesEntity,
    resetRelationSides,
} from "../../../src/domain/er/relations";

const createSide = ({
    idMx = "side-1",
    entityId = "entity-1",
    cardinality = "1:1",
} = {}) => ({
    idMx,
    cardinality,
    cell: "",
    edgeId: "",
    entity: { idMx: entityId },
});

const createRelation = (overrides = {}) => ({
    idMx: "relation-1",
    side1: createSide({ idMx: "side-1", entityId: "entity-1" }),
    side2: createSide({ idMx: "side-2", entityId: "entity-2" }),
    canHoldAttributes: true,
    ...overrides,
});

describe("Relation participant helpers", () => {
    test("return binary side keys and sides in order", () => {
        const relation = createRelation();

        expect(getRelationSideKeys(relation)).toEqual(
            BINARY_RELATION_SIDE_KEYS,
        );
        expect(getRelationSides(relation)).toEqual([
            relation.side1,
            relation.side2,
        ]);
    });

    test("return configured entity ids", () => {
        expect(getRelationEntityIds(createRelation())).toEqual([
            "entity-1",
            "entity-2",
        ]);
    });

    test("detect configured binary relations", () => {
        expect(relationHasBothEntitySides(createRelation())).toBe(true);
        expect(relationHasAllSideIds(createRelation())).toBe(true);
        expect(isRelationConfigured(createRelation())).toBe(true);

        expect(
            relationHasBothEntitySides(
                createRelation({
                    side2: createSide({ idMx: "side-2", entityId: "" }),
                }),
            ),
        ).toBe(false);

        expect(
            relationHasAllSideIds(
                createRelation({
                    side2: createSide({ idMx: "", entityId: "entity-2" }),
                }),
            ),
        ).toBe(false);

        expect(
            isRelationConfigured(
                createRelation({
                    side2: createSide({ idMx: "", entityId: "entity-2" }),
                }),
            ),
        ).toBe(false);
    });

    test("detect self relations and entity participation", () => {
        const selfRelation = createRelation({
            side2: createSide({ idMx: "side-2", entityId: "entity-1" }),
        });

        expect(isSelfRelation(selfRelation)).toBe(true);
        expect(relationInvolvesEntity(selfRelation, "entity-1")).toBe(true);
        expect(relationInvolvesEntity(selfRelation, "entity-3")).toBe(false);
        expect(relationInvolvesEntity(selfRelation, "")).toBe(false);
    });

    test("detect many-to-many relations from side cardinalities", () => {
        expect(
            isManyToManyRelation(
                createRelation({
                    side1: createSide({ cardinality: "0:N" }),
                    side2: createSide({ cardinality: "1:N" }),
                }),
            ),
        ).toBe(true);

        expect(
            isManyToManyRelation(
                createRelation({
                    side1: createSide({ cardinality: "0:N" }),
                    side2: createSide({ cardinality: "1:1" }),
                }),
            ),
        ).toBe(false);
    });

    test("reset binary relation sides through side keys", () => {
        const relation = createRelation();

        resetRelationSides(relation, { cardinality: "X:X" });

        expect(relation.side1).toEqual(
            createEmptyRelationSide({ cardinality: "X:X" }),
        );
        expect(relation.side2).toEqual(
            createEmptyRelationSide({ cardinality: "X:X" }),
        );
        expect(relation.canHoldAttributes).toBe(false);
    });
});