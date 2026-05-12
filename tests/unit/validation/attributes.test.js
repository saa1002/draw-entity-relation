import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    repeatedAttributesInEntity,
    emptyCompositeAttributes,
    unsupportedMultivaluedAttributes,
    nmRelationsWithPK,
    sqlIdentifierCollisions,
    validateGraph,
} from '../../../src/domain/er/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})
describe("Attribute name uniqueness", () => {
    test("Entities with unique attribute names should be valid", () => {
        expect(repeatedAttributesInEntity(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noRepeatedAttrNames).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test("Entities can't have repeated attributes names", () => {
        expect(repeatedAttributesInEntity(graph)).toBe(false);
        // Set an attribute in an entity to the same name of other
        graph.entities.at(0).attributes.at(1).name = graph.entities.at(0).attributes.at(0).name
        expect(repeatedAttributesInEntity(graph)).toBe(true);
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(false)
    })

    test("N:M relations can't have repeated attributes names", () => {
        // Test the graph without repeated attributes
        expect(repeatedAttributesInEntity(graph)).toBe(false);
        // Set an attribute in an N:M relation to the same name of other
        graph.relations.at(0).attributes.at(1).name = graph.relations.at(0).attributes.at(0).name
        expect(repeatedAttributesInEntity(graph)).toBe(true);
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(false)
    })
    test("Composite attributes can't have repeated sibling attribute names", () => {
        graph.entities.at(0).attributes.push({
            idMx: "attr-composite",
            name: "direccion",
            key: false,
            partialKey: false,
            children: [
                {
                    idMx: "attr-street-1",
                    name: "calle",
                    key: false,
                    partialKey: false,
                },
                {
                    idMx: "attr-street-2",
                    name: "calle",
                    key: false,
                    partialKey: false,
                },
            ],
        });

        expect(repeatedAttributesInEntity(graph)).toBe(true);
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(false);
    });
    
    test("Attributes in different composite branches may reuse the same leaf name", () => {
        graph.entities.at(0).attributes.push(
            {
                idMx: "attr-address",
                name: "direccion",
                key: false,
                partialKey: false,
                children: [
                    {
                        idMx: "attr-address-street",
                        name: "calle",
                        key: false,
                        partialKey: false,
                    },
                ],
            },
            {
                idMx: "attr-billing-address",
                name: "direccion_facturacion",
                key: false,
                partialKey: false,
                children: [
                    {
                        idMx: "attr-billing-street",
                        name: "calle",
                        key: false,
                        partialKey: false,
                    },
                ],
            },
        );

        expect(repeatedAttributesInEntity(graph)).toBe(false);
        expect(validateGraph(graph).noRepeatedAttrNames).toBe(true);
    });    
})

describe("N:M relation attribute constraints", ()=> {
    test("An N:M relation without primary key attributes should be valid", () => {
        expect(nmRelationsWithPK(graph)).toBe(false)

        const diagnostics = validateGraph(graph)

        expect(diagnostics.noNMRelationsWithPK).toBe(true)
        expect(diagnostics.isValid).toBe(true)
    })

    test("N:M relations can't have primary key attributes", () => {
        expect(nmRelationsWithPK(graph)).toBe(false);

        graph.relations.at(0).attributes.at(0).key = true;

        expect(nmRelationsWithPK(graph)).toBe(true);
        expect(validateGraph(graph).noNMRelationsWithPK).toBe(false);
    })
    
    test("N:M relations can't have nested primary key attributes", () => {
        expect(nmRelationsWithPK(graph)).toBe(false);

        graph.relations.at(0).attributes = [
            {
                idMx: "attr-composite",
                name: "periodo",
                key: false,
                partialKey: false,
                children: [
                    {
                        idMx: "attr-nested-key",
                        name: "id",
                        key: true,
                        partialKey: false,
                    },
                ],
            },
        ];

        expect(nmRelationsWithPK(graph)).toBe(true);
        expect(validateGraph(graph).noNMRelationsWithPK).toBe(false);
    });
})

describe("SQL identifier normalization", () => {
    test("Attributes normalized for SQL should not collide", () => {
        expect(sqlIdentifierCollisions(graph)).toBe(false)

        graph.entities.at(0).attributes.at(0).name = "código"
        graph.entities.at(0).attributes.at(1).name = "codigo"

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
                name: "direccion_codigo",
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
})

describe("Composite attribute structure", () => {
    test("Explicit empty composite attributes should be invalid", () => {
        graph.entities.at(0).attributes.push({
            idMx: "attr-empty-composite",
            name: "direccion",
            key: false,
            partialKey: false,
            children: [],
        });

        expect(emptyCompositeAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noEmptyCompositeAttributes).toBe(false);
    });

    test("Nested explicit empty composite attributes should be invalid", () => {
        graph.entities.at(0).attributes.push({
            idMx: "attr-composite",
            name: "direccion",
            key: false,
            partialKey: false,
            children: [
                {
                    idMx: "attr-empty-nested-composite",
                    name: "ubicacion",
                    key: false,
                    partialKey: false,
                    children: [],
                },
            ],
        });

        expect(emptyCompositeAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noEmptyCompositeAttributes).toBe(false);
    });
});

describe("Multivalued attribute constraints", () => {
    test("Simple entity multivalued attributes should be valid", () => {
        graph.entities.at(0).attributes.push({
            idMx: "attr-phones",
            name: "telefonos",
            key: false,
            partialKey: false,
            multivalued: true,
        });

        expect(unsupportedMultivaluedAttributes(graph)).toBe(false);
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            true,
        );
    });

    test("Primary key attributes can't be multivalued", () => {
        graph.entities.at(0).attributes.at(0).multivalued = true;

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        );
    });

    test("Partial key attributes can't be multivalued", () => {
        graph.entities.at(0).attributes.push({
            idMx: "attr-partial",
            name: "codigo",
            key: false,
            partialKey: true,
            multivalued: true,
        });

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        );
    });

    test("Composite attributes can't be multivalued yet", () => {
        graph.entities.at(0).attributes.push({
            idMx: "attr-contact",
            name: "contacto",
            key: false,
            partialKey: false,
            multivalued: true,
            children: [
                {
                    idMx: "attr-phone",
                    name: "telefono",
                    key: false,
                    partialKey: false,
                },
            ],
        });

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        );
    });

    test("Nested attributes can't be multivalued yet", () => {
        graph.entities.at(0).attributes.push({
            idMx: "attr-contact",
            name: "contacto",
            key: false,
            partialKey: false,
            children: [
                {
                    idMx: "attr-phone",
                    name: "telefono",
                    key: false,
                    partialKey: false,
                    multivalued: true,
                },
            ],
        });

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        );
    });

    test("Relation attributes can't be multivalued yet", () => {
        graph.relations.at(0).attributes.at(0).multivalued = true;

        expect(unsupportedMultivaluedAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noUnsupportedMultivaluedAttributes).toBe(
            false,
        );
    });
});