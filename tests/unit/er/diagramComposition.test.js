import { describe, expect, test } from "vitest";
import {
    DIAGRAM_COMPOSITION_MODES,
    composeDiagramData,
    mergeDiagramData,
} from "../../../src/domain/er/diagramComposition";

const createEntity = ({
    idMx,
    name,
    x,
    y,
    attributeId = `${idMx}-attr`,
    attributeName = "id",
}) => ({
    idMx,
    name,
    position: { x, y },
    weak: false,
    ownerEntityId: null,
    identifyingRelationId: null,
    attributes: [
        {
            idMx: attributeId,
            name: attributeName,
            position: { x: x + 120, y },
            key: true,
            partialKey: false,
            cell: [attributeId, `${attributeId}-edge`],
            offsetX: 120,
            offsetY: 0,
        },
    ],
});

describe("diagram composition", () => {
    test("replace mode returns the imported diagram without keeping current elements", () => {
        const currentDiagram = {
            entities: [createEntity({ idMx: "entity-1", name: "Cliente", x: 0, y: 0 })],
            relations: [],
            isas: [],
        };

        const importedDiagram = {
            entities: [createEntity({ idMx: "entity-2", name: "Pedido", x: 100, y: 100 })],
            relations: [],
            isas: [],
        };

        const result = composeDiagramData({
            currentDiagram,
            importedDiagram,
            mode: DIAGRAM_COMPOSITION_MODES.REPLACE,
        });

        expect(result.entities).toHaveLength(1);
        expect(result.entities[0].name).toBe("Pedido");
    });

    test("merge mode keeps current elements and renames duplicated entity and relation names", () => {
        const currentDiagram = {
            entities: [
                createEntity({
                    idMx: "entity-1",
                    name: "Entidad",
                    x: 100,
                    y: 100,
                }),
            ],
            relations: [
                {
                    idMx: "relation-1",
                    name: "Relación",
                    position: { x: 260, y: 100 },
                    canHoldAttributes: false,
                    isIdentifying: false,
                    attributes: [],
                    side1: {
                        idMx: "relation-1-side1",
                        cardinality: "1:1",
                        role: "",
                        cell: "relation-1-side1",
                        edgeId: "relation-1-side1-edge",
                        entity: { idMx: "entity-1" },
                    },
                    side2: {
                        idMx: "relation-1-side2",
                        cardinality: "1:1",
                        role: "",
                        cell: "relation-1-side2",
                        edgeId: "relation-1-side2-edge",
                        entity: { idMx: "entity-1" },
                    },
                },
            ],
            isas: [],
        };

        const importedDiagram = {
            entities: [
                createEntity({
                    idMx: "entity-2",
                    name: "Entidad",
                    x: 100,
                    y: 100,
                }),
            ],
            relations: [
                {
                    idMx: "relation-2",
                    name: "Relación",
                    position: { x: 260, y: 100 },
                    canHoldAttributes: false,
                    isIdentifying: false,
                    attributes: [],
                    side1: {
                        idMx: "relation-2-side1",
                        cardinality: "1:1",
                        role: "",
                        cell: "relation-2-side1",
                        edgeId: "relation-2-side1-edge",
                        entity: { idMx: "entity-2" },
                    },
                    side2: {
                        idMx: "relation-2-side2",
                        cardinality: "1:1",
                        role: "",
                        cell: "relation-2-side2",
                        edgeId: "relation-2-side2-edge",
                        entity: { idMx: "entity-2" },
                    },
                },
            ],
            isas: [],
        };

        const result = mergeDiagramData(currentDiagram, importedDiagram);

        expect(result.entities.map((entity) => entity.name)).toEqual([
            "Entidad",
            "Entidad (1)",
        ]);

        expect(result.relations.map((relation) => relation.name)).toEqual([
            "Relación",
            "Relación (1)",
        ]);

        expect(result.entities[1].idMx).not.toBe("entity-2");
        expect(result.relations[1].side1.entity.idMx).toBe(result.entities[1].idMx);
        expect(result.entities[1].position.x).toBeGreaterThan(
            result.entities[0].position.x,
        );
    });

    test("merge mode remaps ISA and weak entity references", () => {
        const currentDiagram = {
            entities: [
                createEntity({
                    idMx: "current-entity",
                    name: "Actual",
                    x: 100,
                    y: 100,
                }),
            ],
            relations: [],
            isas: [],
        };

        const importedDiagram = {
            entities: [
                createEntity({
                    idMx: "owner-entity",
                    name: "Propietaria",
                    x: 100,
                    y: 100,
                }),
                {
                    ...createEntity({
                        idMx: "weak-entity",
                        name: "Débil",
                        x: 300,
                        y: 100,
                        attributeName: "discriminante",
                    }),
                    weak: true,
                    ownerEntityId: "owner-entity",
                    identifyingRelationId: "identifying-relation",
                    attributes: [
                        {
                            idMx: "weak-discriminant",
                            name: "discriminante",
                            position: { x: 420, y: 100 },
                            key: false,
                            partialKey: true,
                            cell: [
                                "weak-discriminant",
                                "weak-discriminant-edge",
                            ],
                            offsetX: 120,
                            offsetY: 0,
                        },
                    ],
                },
            ],
            relations: [
                {
                    idMx: "identifying-relation",
                    name: "Identifica",
                    position: { x: 200, y: 100 },
                    canHoldAttributes: false,
                    isIdentifying: true,
                    attributes: [],
                    side1: {
                        idMx: "identifying-side-1",
                        cardinality: "1:1",
                        role: "",
                        cell: "identifying-side-1",
                        edgeId: "identifying-side-1-edge",
                        entity: { idMx: "owner-entity" },
                    },
                    side2: {
                        idMx: "identifying-side-2",
                        cardinality: "0:N",
                        role: "",
                        cell: "identifying-side-2",
                        edgeId: "identifying-side-2-edge",
                        entity: { idMx: "weak-entity" },
                    },
                },
            ],
            isas: [
                {
                    idMx: "isa-1",
                    position: { x: 200, y: 300 },
                    generalization: {
                        edgeId: "isa-generalization-edge",
                        entity: { idMx: "owner-entity" },
                    },
                    specializations: [
                        {
                            edgeId: "isa-specialization-edge",
                            entity: { idMx: "weak-entity" },
                        },
                    ],
                },
            ],
        };

        const result = mergeDiagramData(currentDiagram, importedDiagram);

        const ownerEntity = result.entities.find(
            (entity) => entity.name === "Propietaria",
        );
        const weakEntity = result.entities.find(
            (entity) => entity.name === "Débil",
        );
        const identifyingRelation = result.relations.find(
            (relation) => relation.name === "Identifica",
        );
        const isa = result.isas[0];

        expect(weakEntity.ownerEntityId).toBe(ownerEntity.idMx);
        expect(weakEntity.identifyingRelationId).toBe(
            identifyingRelation.idMx,
        );
        expect(identifyingRelation.side1.entity.idMx).toBe(ownerEntity.idMx);
        expect(identifyingRelation.side2.entity.idMx).toBe(weakEntity.idMx);
        expect(isa.generalization.entity.idMx).toBe(ownerEntity.idMx);
        expect(isa.specializations[0].entity.idMx).toBe(weakEntity.idMx);
    });

    test("merge mode renames duplicated sibling attributes", () => {
        const currentDiagram = {
            entities: [],
            relations: [],
            isas: [],
        };

        const importedDiagram = {
            entities: [
                {
                    idMx: "entity-1",
                    name: "Entidad",
                    position: { x: 100, y: 100 },
                    weak: false,
                    ownerEntityId: null,
                    identifyingRelationId: null,
                    attributes: [
                        {
                            idMx: "attr-1",
                            name: "dato",
                            position: { x: 220, y: 100 },
                            key: true,
                            partialKey: false,
                            cell: ["attr-1", "attr-1-edge"],
                            offsetX: 120,
                            offsetY: 0,
                        },
                        {
                            idMx: "attr-2",
                            name: "dato",
                            position: { x: 220, y: 160 },
                            key: false,
                            partialKey: false,
                            cell: ["attr-2", "attr-2-edge"],
                            offsetX: 120,
                            offsetY: 60,
                        },
                    ],
                },
            ],
            relations: [],
            isas: [],
        };

        const result = mergeDiagramData(currentDiagram, importedDiagram);

        expect(result.entities[0].attributes.map((attribute) => attribute.name))
            .toEqual(["dato", "dato (1)"]);
    });
});