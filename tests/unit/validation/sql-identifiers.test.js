
import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    sqlIdentifierCollisions,
    validateGraph,
} from '../../../src/domain/er/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe("SQL identifier normalization", () => {
    test("Attributes normalized for SQL should not collide", () => {
        expect(sqlIdentifierCollisions(graph)).toBe(false)

        graph.entities.at(0).attributes.at(0).name = "código"
        graph.entities.at(0).attributes.at(1).name = "codigo"

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })

    test("Normalized SQL identifiers should not collide", () => {
        expect(sqlIdentifierCollisions(graph)).toBe(false)

        graph.entities.at(0).name = "País"
        graph.entities.at(1).name = "Pais"

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })
    
    test("Composite attribute projections that normalize to the same SQL column should be invalid", () => {
        graph.entities.at(0).attributes = [
            {
                idMx: "attr-1",
                name: "direccion",
                key: false,
                partialKey: false,
                children: [
                    {
                        idMx: "attr-2",
                        name: "código",
                        key: false,
                        partialKey: false,
                    },
                ],
            },
            {
                idMx: "attr-3",
                name: "codigo",
                key: true,
                partialKey: false,
            },
        ];

        expect(sqlIdentifierCollisions(graph)).toBe(true);
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false);
    });

    test("Multivalued auxiliary table names should not collide with entity table names", () => {
        graph.entities.at(0).name = "Cliente";
        graph.entities.at(0).attributes = [
            {
                idMx: "attr-id-cliente",
                name: "id_cliente",
                key: true,
                partialKey: false,
            },
            {
                idMx: "attr-telefono",
                name: "telefono",
                key: false,
                partialKey: false,
                multivalued: true,
            },
        ];

        graph.entities.push({
            idMx: "entity-cliente-telefono",
            name: "Cliente_telefono",
            weak: false,
            attributes: [
                {
                    idMx: "attr-id-tabla",
                    name: "id",
                    key: true,
                    partialKey: false,
                },
            ],
        });

        expect(sqlIdentifierCollisions(graph)).toBe(true);
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false);
    });

    test("Multivalued auxiliary table names should not collide with other auxiliary table names", () => {
        graph.entities.at(0).name = "Cliente";
        graph.entities.at(0).attributes = [
            {
                idMx: "attr-id-cliente",
                name: "id_cliente",
                key: true,
                partialKey: false,
            },
            {
                idMx: "attr-telefono-movil",
                name: "telefono_movil",
                key: false,
                partialKey: false,
                multivalued: true,
            },
        ];

        graph.entities.push({
            idMx: "entity-cliente-telefono",
            name: "Cliente_telefono",
            weak: false,
            attributes: [
                {
                    idMx: "attr-id-cliente-telefono",
                    name: "id_cliente_telefono",
                    key: true,
                    partialKey: false,
                },
                {
                    idMx: "attr-movil",
                    name: "movil",
                    key: false,
                    partialKey: false,
                    multivalued: true,
                },
            ],
        });

        expect(sqlIdentifierCollisions(graph)).toBe(true);
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false);
    });

    test("Multivalued auxiliary table columns should not collide with composite owner key columns", () => {
        const diagram = {
            entities: [
                {
                    idMx: "entity-documento",
                    name: "Documento",
                    weak: false,
                    attributes: [
                        {
                            idMx: "attr-codigo",
                            name: "codigo",
                            key: true,
                            partialKey: false,
                            children: [
                                {
                                    idMx: "attr-serie",
                                    name: "serie",
                                    key: false,
                                    partialKey: false,
                                },
                                {
                                    idMx: "attr-numero",
                                    name: "numero",
                                    key: false,
                                    partialKey: false,
                                },
                            ],
                        },
                        {
                            idMx: "attr-codigo-numero",
                            name: "numero",
                            key: false,
                            partialKey: false,
                            multivalued: true,
                        },
                    ],
                },
            ],
            relations: [],
        };

        expect(sqlIdentifierCollisions(diagram)).toBe(true);
        expect(validateGraph(diagram).noSQLIdentifierCollisions).toBe(false);
    });

    test("Multivalued auxiliary table columns should not collide with weak owner key columns", () => {
        const diagram = {
            entities: [
                {
                    idMx: "entity-pedido",
                    name: "Pedido",
                    weak: false,
                    attributes: [
                        {
                            idMx: "attr-id-pedido",
                            name: "id_pedido",
                            key: true,
                            partialKey: false,
                        },
                    ],
                },
                {
                    idMx: "entity-linea-pedido",
                    name: "LineaPedido",
                    weak: true,
                    ownerEntityId: "entity-pedido",
                    identifyingRelationId: "relation-identifica",
                    attributes: [
                        {
                            idMx: "attr-numero-linea",
                            name: "numero_linea",
                            key: false,
                            partialKey: true,
                        },
                        {
                            idMx: "attr-id-pedido-pedido",
                            name: "id_pedido_Pedido",
                            key: false,
                            partialKey: false,
                            multivalued: true,
                        },
                    ],
                },
            ],
            relations: [
                {
                    idMx: "relation-identifica",
                    name: "Identifica",
                    isIdentifying: true,
                    attributes: [],
                    side1: {
                        cardinality: "1:N",
                        entity: { idMx: "entity-linea-pedido" },
                    },
                    side2: {
                        cardinality: "1:1",
                        entity: { idMx: "entity-pedido" },
                    },
                },
            ],
        };

        expect(sqlIdentifierCollisions(diagram)).toBe(true);
        expect(validateGraph(diagram).noSQLIdentifierCollisions).toBe(false);
    });   
    
    test("Composite multivalued auxiliary table leaf columns should not collide after SQL normalization", () => {
        graph.entities.at(0).name = "Cliente";
        graph.entities.at(0).attributes = [
            {
                idMx: "attr-id-cliente",
                name: "id_cliente",
                key: true,
                partialKey: false,
            },
            {
                idMx: "attr-contacto",
                name: "contacto",
                key: false,
                partialKey: false,
                multivalued: true,
                children: [
                    {
                        idMx: "attr-codigo-accent",
                        name: "código",
                        key: false,
                        partialKey: false,
                    },
                    {
                        idMx: "attr-codigo",
                        name: "codigo",
                        key: false,
                        partialKey: false,
                    },
                ],
            },
        ];

        expect(sqlIdentifierCollisions(graph)).toBe(true);
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false);
    });
    
    test("Composite multivalued auxiliary table leaf columns should not collide with owner key columns", () => {
        graph.entities.at(0).name = "Cliente";
        graph.entities.at(0).attributes = [
            {
                idMx: "attr-id-cliente",
                name: "id_cliente",
                key: true,
                partialKey: false,
            },
            {
                idMx: "attr-id",
                name: "id",
                key: false,
                partialKey: false,
                multivalued: true,
                children: [
                    {
                        idMx: "attr-cliente",
                        name: "id_cliente",
                        key: false,
                        partialKey: false,
                    },
                ],
            },
        ];

        expect(sqlIdentifierCollisions(graph)).toBe(true);
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false);
    });
})