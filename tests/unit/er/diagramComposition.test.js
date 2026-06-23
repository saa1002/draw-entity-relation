import { describe, expect, test } from "vitest";
import {
    DIAGRAM_COMPOSITION_MODES,
    composeDiagramData,
    mergeDiagramData,
} from "../../../src/domain/er/diagramComposition";
import {
    createAttribute,
    createBinaryRelation,
    createDiagram,
    createIsaHierarchy,
    createRelationSide,
    createStrongEntity,
    createWeakEntity,
} from "../../helpers/diagramBuilders";

const createImportAttribute = ({
    idMx,
    name = "id",
    x,
    y,
    key = true,
    partialKey = false,
    offsetX = 120,
    offsetY = 0,
} = {}) =>
    createAttribute({
        idMx,
        name,
        position: { x, y },
        key,
        partialKey,
        cell: [idMx, `${idMx}-edge`],
        offsetX,
        offsetY,
    });

const createImportEntity = ({
    idMx,
    name,
    x,
    y,
    attributeId = `${idMx}-attr`,
    attributeName = "id",
    attributes,
}) => ({
    ...createStrongEntity({
        idMx,
        name,
        attributes:
            attributes ??
            [
                createImportAttribute({
                    idMx: attributeId,
                    name: attributeName,
                    x: x + 120,
                    y,
                }),
            ],
    }),
    position: { x, y },
    ownerEntityId: null,
    identifyingRelationId: null,
});

const createImportWeakEntity = ({
    idMx,
    name,
    x,
    y,
    ownerEntityId,
    identifyingRelationId,
    attributeId = "weak-discriminant",
    attributeName = "discriminante",
}) => ({
    ...createWeakEntity({
        idMx,
        name,
        ownerEntityId,
        identifyingRelationId,
        attributes: [
            createImportAttribute({
                idMx: attributeId,
                name: attributeName,
                x: x + 120,
                y,
                key: false,
                partialKey: true,
            }),
        ],
    }),
    position: { x, y },
});

const createImportRelationSide = ({
    idMx,
    entity,
    cardinality = "1:1",
}) =>
    createRelationSide({
        idMx,
        cardinality,
        role: "",
        cell: idMx,
        edgeId: `${idMx}-edge`,
        entity,
    });

const createSelfRelation = ({
    idMx,
    name,
    entity,
    x = 260,
    y = 100,
}) =>
    createBinaryRelation({
        idMx,
        name,
        position: { x, y },
        canHoldAttributes: false,
        isIdentifying: false,
        side1: createImportRelationSide({
            idMx: `${idMx}-side1`,
            entity,
        }),
        side2: createImportRelationSide({
            idMx: `${idMx}-side2`,
            entity,
        }),
    });

const createIdentifyingImportRelation = ({
    idMx,
    name,
    ownerEntity,
    weakEntity,
    x = 200,
    y = 100,
}) =>
    createBinaryRelation({
        idMx,
        name,
        position: { x, y },
        canHoldAttributes: false,
        isIdentifying: true,
        side1: createImportRelationSide({
            idMx: `${idMx}-side-1`,
            entity: ownerEntity,
            cardinality: "1:1",
        }),
        side2: createImportRelationSide({
            idMx: `${idMx}-side-2`,
            entity: weakEntity,
            cardinality: "0:N",
        }),
    });

describe("diagram composition", () => {
    test("replace mode returns the imported diagram without keeping current elements", () => {
        const currentDiagram = createDiagram({
            entities: [
                createImportEntity({
                    idMx: "entity-1",
                    name: "Cliente",
                    x: 0,
                    y: 0,
                }),
            ],
        });

        const importedDiagram = createDiagram({
            entities: [
                createImportEntity({
                    idMx: "entity-2",
                    name: "Pedido",
                    x: 100,
                    y: 100,
                }),
            ],
        });

        const result = composeDiagramData({
            currentDiagram,
            importedDiagram,
            mode: DIAGRAM_COMPOSITION_MODES.REPLACE,
        });

        expect(result.entities).toHaveLength(1);
        expect(result.entities[0].name).toBe("Pedido");
    });

    test("merge mode keeps current elements and renames duplicated entity and relation names", () => {
        const currentDiagram = createDiagram({
            entities: [
                createImportEntity({
                    idMx: "entity-1",
                    name: "Entidad",
                    x: 100,
                    y: 100,
                }),
            ],
            relations: [
                createSelfRelation({
                    idMx: "relation-1",
                    name: "Relación",
                    entity: "entity-1",
                }),
            ],
        });

        const importedDiagram = createDiagram({
            entities: [
                createImportEntity({
                    idMx: "entity-2",
                    name: "Entidad",
                    x: 100,
                    y: 100,
                }),
            ],
            relations: [
                createSelfRelation({
                    idMx: "relation-2",
                    name: "Relación",
                    entity: "entity-2",
                }),
            ],
        });

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
        expect(result.relations[1].side1.entity.idMx).toBe(
            result.entities[1].idMx,
        );
        expect(result.entities[1].position.x).toBeGreaterThan(
            result.entities[0].position.x,
        );
    });

    test("merge mode remaps ISA and weak entity references", () => {
        const currentDiagram = createDiagram({
            entities: [
                createImportEntity({
                    idMx: "current-entity",
                    name: "Actual",
                    x: 100,
                    y: 100,
                }),
            ],
        });

        const ownerEntity = createImportEntity({
            idMx: "owner-entity",
            name: "Propietaria",
            x: 100,
            y: 100,
        });
        const weakEntity = createImportWeakEntity({
            idMx: "weak-entity",
            name: "Débil",
            x: 300,
            y: 100,
            ownerEntityId: ownerEntity.idMx,
            identifyingRelationId: "identifying-relation",
        });

        const importedDiagram = createDiagram({
            entities: [ownerEntity, weakEntity],
            relations: [
                createIdentifyingImportRelation({
                    idMx: "identifying-relation",
                    name: "Identifica",
                    ownerEntity,
                    weakEntity,
                }),
            ],
            isas: [
                createIsaHierarchy({
                    idMx: "isa-1",
                    position: { x: 200, y: 300 },
                    generalization: ownerEntity,
                    specializations: [weakEntity],
                }),
            ],
        });

        const result = mergeDiagramData(currentDiagram, importedDiagram);

        const remappedOwnerEntity = result.entities.find(
            (entity) => entity.name === "Propietaria",
        );
        const remappedWeakEntity = result.entities.find(
            (entity) => entity.name === "Débil",
        );
        const identifyingRelation = result.relations.find(
            (relation) => relation.name === "Identifica",
        );
        const isa = result.isas[0];

        expect(remappedWeakEntity.ownerEntityId).toBe(remappedOwnerEntity.idMx);
        expect(remappedWeakEntity.identifyingRelationId).toBe(
            identifyingRelation.idMx,
        );
        expect(identifyingRelation.side1.entity.idMx).toBe(
            remappedOwnerEntity.idMx,
        );
        expect(identifyingRelation.side2.entity.idMx).toBe(
            remappedWeakEntity.idMx,
        );
        expect(isa.generalization.entity.idMx).toBe(remappedOwnerEntity.idMx);
        expect(isa.specializations[0].entity.idMx).toBe(
            remappedWeakEntity.idMx,
        );
    });

    test("merge mode renames duplicated sibling attributes", () => {
        const currentDiagram = createDiagram();

        const importedDiagram = createDiagram({
            entities: [
                createImportEntity({
                    idMx: "entity-1",
                    name: "Entidad",
                    x: 100,
                    y: 100,
                    attributes: [
                        createImportAttribute({
                            idMx: "attr-1",
                            name: "dato",
                            x: 220,
                            y: 100,
                        }),
                        createImportAttribute({
                            idMx: "attr-2",
                            name: "dato",
                            x: 220,
                            y: 160,
                            key: false,
                            offsetY: 60,
                        }),
                    ],
                }),
            ],
        });

        const result = mergeDiagramData(currentDiagram, importedDiagram);

        expect(
            result.entities[0].attributes.map((attribute) => attribute.name),
        ).toEqual(["dato", "dato (1)"]);
    });
});