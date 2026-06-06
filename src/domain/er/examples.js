import { normalizeDiagramData } from "./diagramNormalization";

export const createExampleDiagramStructure = () =>
    normalizeDiagramData({
        entities: [
            {
                idMx: "example-entity-1",
                name: "Entidad",
                position: { x: 130, y: 180 },
                weak: false,
                ownerEntityId: null,
                identifyingRelationId: null,
                attributes: [
                    {
                        idMx: "example-entity-1-attribute-1",
                        name: "Atributo",
                        position: { x: 105, y: 100 },
                        key: true,
                        partialKey: false,
                        cell: [
                            "example-entity-1-attribute-1",
                            "example-edge-entity-1-attribute-1",
                        ],
                        offsetX: -25,
                        offsetY: -80,
                    },
                    {
                        idMx: "example-entity-1-attribute-2",
                        name: "Atributo 1",
                        position: { x: 105, y: 275 },
                        key: false,
                        partialKey: false,
                        cell: [
                            "example-entity-1-attribute-2",
                            "example-edge-entity-1-attribute-2",
                        ],
                        offsetX: -25,
                        offsetY: 95,
                    },
                ],
            },
            {
                idMx: "example-entity-2",
                name: "Entidad 1",
                position: { x: 590, y: 180 },
                weak: false,
                ownerEntityId: null,
                identifyingRelationId: null,
                attributes: [
                    {
                        idMx: "example-entity-2-attribute-1",
                        name: "Atributo",
                        position: { x: 565, y: 100 },
                        key: true,
                        partialKey: false,
                        cell: [
                            "example-entity-2-attribute-1",
                            "example-edge-entity-2-attribute-1",
                        ],
                        offsetX: -25,
                        offsetY: -80,
                    },
                    {
                        idMx: "example-entity-2-attribute-2",
                        name: "Atributo 1",
                        position: { x: 590, y: 275 },
                        key: false,
                        partialKey: false,
                        cell: [
                            "example-entity-2-attribute-2",
                            "example-edge-entity-2-attribute-2",
                        ],
                        offsetX: 0,
                        offsetY: 95,
                    },
                ],
            },
        ],
        relations: [
            {
                idMx: "example-relation-1",
                name: "Relación",
                position: { x: 370, y: 200 },
                side1: {
                    idMx: "example-cardinality-relation-1-entity-1",
                    cardinality: "0:N",
                    role: "",
                    cell: "example-cardinality-relation-1-entity-1",
                    edgeId: "example-edge-relation-1-entity-1",
                    entity: { idMx: "example-entity-1" },
                },
                side2: {
                    idMx: "example-cardinality-relation-1-entity-2",
                    cardinality: "0:N",
                    role: "",
                    cell: "example-cardinality-relation-1-entity-2",
                    edgeId: "example-edge-relation-1-entity-2",
                    entity: { idMx: "example-entity-2" },
                },
                canHoldAttributes: true,
                isIdentifying: false,
                attributes: [
                    {
                        idMx: "example-relation-1-attribute-1",
                        name: "Atributo",
                        position: { x: 370, y: 315 },
                        key: false,
                        partialKey: false,
                        cell: [
                            "example-relation-1-attribute-1",
                            "example-edge-relation-1-attribute-1",
                        ],
                        offsetX: 0,
                        offsetY: 115,
                    },
                ],
            },
        ],
        isas: [],
    });
