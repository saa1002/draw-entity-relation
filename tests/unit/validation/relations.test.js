import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    relationsUnconnected,
    validateGraph,
    cardinalitiesNotValid,
    notNMRelationsWithAttributes,
    brokenRelationEntityReferences,
} from '../../../src/utils/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe("Relations", () => {
    test("Every relation should connect two entities (can be the same at both sides)", () => {
        // Ensure the graph is valid initially
        expect(relationsUnconnected(graph)).toBe(false);

        const initializedSide = { 
            cardinality: "",
            cell: "",
            entity: {
                idMx: "",
            },
            idMx: "",
        }

        graph.relations.at(1).side1 = initializedSide;
        graph.relations.at(1).side2 = initializedSide;

        expect(relationsUnconnected(graph)).toBe(true);
        expect(validateGraph(graph).noUnconnectedRelations).toBe(false)
    });

    test("Every relation should reference existing entities", () => {
        expect(brokenRelationEntityReferences(graph)).toBe(false)

        graph.relations.at(1).side1.entity.idMx = "non-existing-entity-id"

        expect(relationsUnconnected(graph)).toBe(false)
        expect(brokenRelationEntityReferences(graph)).toBe(true)
        expect(validateGraph(graph).noBrokenRelationEntityReferences).toBe(false)
    })

    test("Cant be relations with attributes if they are not N:M", () => {
        // Ensure the graph is valid initially
        expect(relationsUnconnected(graph)).toBe(false);

        const attributes = [
            {
                "idMx":"9",
                "name":"Atributo",
                "position": {
                    "x":560,
                    "y":130
                },
                "cell":[
                    "9",
                    "10"
                ]
            },
        ]

        graph.relations.at(1).attributes = attributes

        expect(notNMRelationsWithAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noAttributesInNonNMRelations).toBe(false)
    });

    test("a non N:M relation without attributes should be valid", () => {
        expect(notNMRelationsWithAttributes(graph)).toBe(false);

        const diagnostics = validateGraph(graph);

        expect(diagnostics.noAttributesInNonNMRelations).toBe(true);
        expect(diagnostics.isValid).toBe(true);
    });
    
    test("Every relation should have valid cardinalities", () => {
        // Ensure the graph is valid initially
        expect(cardinalitiesNotValid(graph)).toBe(false);

        const initializedSide1 = { 
            cardinality: "",
            cell: "20",
            entity: {
                idMx: "",
            },
            idMx: "",
        }

        const initializedSide2 = { 
            cardinality: "",
            cell: "24",
            entity: {
                idMx: "",
            },
            idMx: "",
        }

        graph.relations.at(1).side1 = initializedSide1;
        graph.relations.at(1).side2 = initializedSide2;

        expect(cardinalitiesNotValid(graph)).toBe(true);
        expect(validateGraph(graph).noNotValidCardinalities).toBe(false)
    });

    test("A fully mandatory 1:1 relation should be valid", () => {
        graph.relations.at(1).side1.cardinality = "1:1";
        graph.relations.at(1).side2.cardinality = "1:1";

        const diagnostics = validateGraph(graph);

        expect(cardinalitiesNotValid(graph)).toBe(false);
        expect(diagnostics.noNotValidCardinalities).toBe(true);
        expect(diagnostics.isValid).toBe(true);
    });

    test("A standard 1:N relation should be valid", () => {
        graph.relations.at(1).side1.cardinality = "0:N";
        graph.relations.at(1).side2.cardinality = "1:1";

        const diagnostics = validateGraph(graph);

        expect(cardinalitiesNotValid(graph)).toBe(false);
        expect(diagnostics.noNotValidCardinalities).toBe(true);
        expect(diagnostics.isValid).toBe(true);
    });    
});