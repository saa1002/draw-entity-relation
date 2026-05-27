import { describe, expect, test } from "vitest";
import {
    createEmptyIsaLink,
    createIsaData,
    findIsaById,
    findIsaIndexById,
    getIsaEntityIds,
    getIsaGeneralizationEntityId,
    getIsaSpecializationEntityIds,
    isaHasGeneralization,
    isaHasSpecializations,
    isaInvolvesEntity,
    isIsaConfigured,
} from "../../../src/domain/er/isa";

const createConfiguredIsa = () =>
    createIsaData({
        idMx: "isa-1",
        generalization: createEmptyIsaLink({
            entityId: "entity-parent",
            edgeId: "edge-parent",
        }),
        specializations: [
            createEmptyIsaLink({
                entityId: "entity-child-1",
                edgeId: "edge-child-1",
            }),
            createEmptyIsaLink({
                entityId: "entity-child-2",
                edgeId: "edge-child-2",
            }),
        ],
    });

describe("ISA model helpers", () => {
    test("create empty ISA links with an entity reference placeholder", () => {
        expect(createEmptyIsaLink()).toEqual({
            edgeId: "",
            entity: { idMx: "" },
        });
    });

    test("create ISA data with one generalization link and specialization links", () => {
        const isa = createConfiguredIsa();

        expect(isa).toMatchObject({
            idMx: "isa-1",
            position: { x: 0, y: 0 },
            generalization: {
                edgeId: "edge-parent",
                entity: { idMx: "entity-parent" },
            },
        });
        expect(isa.specializations).toHaveLength(2);
    });

    test("find ISA hierarchies by mxGraph id", () => {
        const diagram = {
            isas: [createIsaData({ idMx: "isa-1" }), createConfiguredIsa()],
        };

        expect(findIsaById(diagram, "isa-1")?.idMx).toBe("isa-1");
        expect(findIsaIndexById(diagram, "isa-1")).toBe(0);
        expect(findIsaById(diagram, "missing")).toBeNull();
        expect(findIsaIndexById(diagram, "missing")).toBe(-1);
    });

    test("list generalization and specialization entity ids", () => {
        const isa = createConfiguredIsa();

        expect(getIsaGeneralizationEntityId(isa)).toBe("entity-parent");
        expect(getIsaSpecializationEntityIds(isa)).toEqual([
            "entity-child-1",
            "entity-child-2",
        ]);
        expect(getIsaEntityIds(isa)).toEqual([
            "entity-parent",
            "entity-child-1",
            "entity-child-2",
        ]);
    });

    test("detect entity participation in an ISA hierarchy", () => {
        const isa = createConfiguredIsa();

        expect(isaInvolvesEntity(isa, "entity-parent")).toBe(true);
        expect(isaInvolvesEntity(isa, "entity-child-2")).toBe(true);
        expect(isaInvolvesEntity(isa, "entity-other")).toBe(false);
    });

    test("detect minimally configured ISA hierarchies", () => {
        const isa = createConfiguredIsa();

        expect(isaHasGeneralization(isa)).toBe(true);
        expect(isaHasSpecializations(isa)).toBe(true);
        expect(isIsaConfigured(isa)).toBe(true);

        expect(
            isIsaConfigured(
                createIsaData({
                    generalization: createEmptyIsaLink({
                        entityId: "entity-parent",
                        edgeId: "edge-parent",
                    }),
                }),
            ),
        ).toBe(false);

        expect(
            isIsaConfigured(
                createIsaData({
                    specializations: [
                        createEmptyIsaLink({
                            entityId: "entity-child",
                            edgeId: "edge-child",
                        }),
                    ],
                }),
            ),
        ).toBe(false);
    });
});