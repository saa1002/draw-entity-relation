import { beforeEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import fs from "fs";
import path from "path";
import { 
    repeatedAttributesInEntity, 
    entitiesWithoutPK,
    repeatedEntities, 
    entitiesWithoutAttributes,
    relationsUnconnected,
    validateGraph, 
    cardinalitiesNotValid,
    notNMRelationsWithAttributes,
    weakEntitiesWithPrimaryKey,
    weakEntitiesWithoutPartialKey,
    weakEntitiesWithMoreThanOnePartialKey,
    strongEntitiesWithPartialKey,
    weakEntitiesWithoutIdentifyingRelation,
    identifyingRelationsNotValid,
    identifyingRelationCardinalitiesNotValid,
    inconsistentWeakEntityOwnership,
    multipleIdentifyingRelationsPerWeakEntity,
} from "../../src/utils/validation"

let graph;

beforeEach(() => {
  // Load fresh data before each test
  const data = readFileSync(resolve(__dirname, './graphs/example.json'), 'utf-8');
  graph = JSON.parse(data);
});

describe("General validation function", () => {
    test("correct graph return true", () => {
        expect(validateGraph(graph).isValid).toBe(true)
    })
})

describe('Non repeated entity or n:m relation name', ()=> {
    test("entities can't have repeated names", () => {
        expect(repeatedEntities(graph)).toBe(false);
        // Access an entity and set its name to an already existing entity name
        graph.entities.at(1).name = graph.entities.at(0).name
        expect(repeatedEntities(graph)).toBe(true);
        expect(validateGraph(graph).noRepeatedNames).toBe(false)
    })

    test("N:M relations and entities can't have repeated names", () => {
        expect(repeatedEntities(graph)).toBe(false);
        // Access the N:M relation and set its name to an already existing entity name
        graph.relations.at(0).name = graph.entities.at(0).name
        expect(repeatedEntities(graph)).toBe(true);
        expect(validateGraph(graph).noRepeatedNames).toBe(false)
    })
})

describe("Non repeated attributes in entities or n:m relations", ()=> {
    test("entities can't have repeated attributes names", () => {
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
})

describe("Every entity should have at least one attribute", () => {
    test("entities must have at least one attribute", () => {
        // Ensure the graph is valid initially
        expect(entitiesWithoutAttributes(graph)).toBe(false);
        // Remove attributes from an entity
        graph.entities.at(0).attributes = [];
        expect(entitiesWithoutAttributes(graph)).toBe(true);
        expect(validateGraph(graph).noEntitiesWithoutAttributes).toBe(false)
    });
});

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
        // Remove attributes from an entity
        graph.relations.at(1).side1 = initializedSide;
        graph.relations.at(1).side2 = initializedSide;
        expect(relationsUnconnected(graph)).toBe(true);
        expect(validateGraph(graph).noUnconnectedRelations).toBe(false)
    });

    test("Cant be relations with attributes if they are not N:M", () => {
        // Ensure the graph is valid initially
        expect(relationsUnconnected(graph)).toBe(false);

        const attributes = [
            {
                "idMx":"9",
                "name":"Atributo",
                "position":{
                    "x":560,
                    "y":130
                },
                "cell":[
                    "9",
                    "10"
                ]
            },
        ]
        // Remove attributes from an entity
        graph.relations.at(1).attributes = attributes
        expect(notNMRelationsWithAttributes(graph)).toBe(true);
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
        // Remove attributes from an entity
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
});

describe("Weak entities", () => {
    test("an identifying relation is invalid if the strong side is not 1:1", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        relation.side1.cardinality = "0:N";
        relation.side2.cardinality = "0:1";

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(true);
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(false);
    });

    test("an identifying relation is invalid if the weak side is not N-based", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        relation.side1.cardinality = "0:1";
        relation.side2.cardinality = "1:1";

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(true);
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(false);
    });

    test("an identifying relation with valid identifying cardinalities should pass validation", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        relation.side1.cardinality = "0:N";
        relation.side2.cardinality = "1:1";

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(false);
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(true);
    });   

    test("an identifying relation should also allow 1:N on the weak side", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        relation.side1.cardinality = "1:N";
        relation.side2.cardinality = "1:1";

        expect(identifyingRelationCardinalitiesNotValid(graph)).toBe(false);
        expect(validateGraph(graph).noInvalidIdentifyingCardinalities).toBe(true);
    }); 
    
    test("a weak entity must have at least one partial key", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.attributes.forEach((attribute) => {
            attribute.partialKey = false;
        });

        expect(weakEntitiesWithoutPartialKey(graph)).toBe(true);
        expect(validateGraph(graph).noWeakEntitiesWithoutPartialKey).toBe(false);
    });

    test("a strong entity cannot have partial key", () => {
        const strongEntity = graph.entities.at(0);

        strongEntity.weak = false;
        strongEntity.attributes.at(0).partialKey = true;

        expect(strongEntitiesWithPartialKey(graph)).toBe(true);
        expect(validateGraph(graph).noStrongEntitiesWithPartialKey).toBe(false);
    });

    test("a weak entity must have an identifying relation", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.identifyingRelationId = null;

        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(true);
        expect(
            validateGraph(graph).noWeakEntitiesWithoutIdentifyingRelation
        ).toBe(false);
    });

    test("a weak entity cannot reference a non-identifying relation", () => {
        const weakEntity = graph.entities.at(0);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        weakEntity.identifyingRelationId = relation.idMx;
        relation.isIdentifying = false;

        expect(weakEntitiesWithoutIdentifyingRelation(graph)).toBe(true);
        expect(
            validateGraph(graph).noWeakEntitiesWithoutIdentifyingRelation
        ).toBe(false);
    });

    test("an identifying relation must connect exactly one weak entity and one strong entity", () => {
        const entity1 = graph.entities.at(0);
        const entity2 = graph.entities.at(1);
        const relation = graph.relations.at(0);

        entity1.weak = false;
        entity2.weak = false;
        relation.isIdentifying = true;

        expect(identifyingRelationsNotValid(graph)).toBe(true);
        expect(validateGraph(graph).noInvalidIdentifyingRelations).toBe(false);
    });

    test("an identifying relation connecting one weak and one strong entity should be valid", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;
        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        expect(identifyingRelationsNotValid(graph)).toBe(false);
    });

    test("a weak entity without primary key can still be valid at PK level", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.attributes.forEach((attribute) => {
            attribute.key = false;
        });

        expect(entitiesWithoutPK(graph)).toBe(false);
        expect(validateGraph(graph).noEntitiesWithoutPK).toBe(true);
    });
    test("a weak entity must be connected to its identifying relation", () => {
        const weakEntity = graph.entities.at(0);
        const ownerEntity = graph.entities.at(1);
        const relation = graph.relations.at(1);

        weakEntity.weak = true;
        weakEntity.identifyingRelationId = relation.idMx;
        weakEntity.ownerEntityId = ownerEntity.idMx;
        relation.isIdentifying = true;

        // La relación 1 en el fixture conecta a Entidad 2 consigo misma,
        // así que no conecta realmente a weakEntity.
        expect(inconsistentWeakEntityOwnership(graph)).toBe(true);
        expect(validateGraph(graph).noInconsistentWeakEntityOwnership).toBe(false);
    });

    test("a weak entity owner must match the strong entity on the other side", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        weakEntity.identifyingRelationId = relation.idMx;
        weakEntity.ownerEntityId = graph.entities.at(2).idMx; // owner incorrecto

        expect(inconsistentWeakEntityOwnership(graph)).toBe(true);
        expect(validateGraph(graph).noInconsistentWeakEntityOwnership).toBe(false);
    });

    test("a weak entity with consistent owner and identifying relation should pass ownership validation", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        weakEntity.identifyingRelationId = relation.idMx;
        weakEntity.ownerEntityId = strongEntity.idMx;

        expect(inconsistentWeakEntityOwnership(graph)).toBe(false);
    });
    test("a weak entity cannot participate in more than one identifying relationship", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity1 = graph.entities.at(1);
        const strongEntity2 = graph.entities.at(2);

        const relation1 = graph.relations.at(0);
        const relation2 = graph.relations.at(1);

        weakEntity.weak = true;
        strongEntity1.weak = false;
        strongEntity2.weak = false;

        relation1.isIdentifying = true;
        relation1.side1.entity.idMx = weakEntity.idMx;
        relation1.side2.entity.idMx = strongEntity1.idMx;

        relation2.isIdentifying = true;
        relation2.side1.entity.idMx = weakEntity.idMx;
        relation2.side2.entity.idMx = strongEntity2.idMx;

        expect(multipleIdentifyingRelationsPerWeakEntity(graph)).toBe(true);
        expect(
            validateGraph(graph).noMultipleIdentifyingRelationsPerWeakEntity,
        ).toBe(false);
    });
    
    test("a weak entity with a single identifying relationship should pass uniqueness validation", () => {
        const weakEntity = graph.entities.at(0);
        const strongEntity = graph.entities.at(1);
        const relation = graph.relations.at(0);

        weakEntity.weak = true;
        strongEntity.weak = false;

        relation.isIdentifying = true;
        relation.side1.entity.idMx = weakEntity.idMx;
        relation.side2.entity.idMx = strongEntity.idMx;

        expect(multipleIdentifyingRelationsPerWeakEntity(graph)).toBe(false);
        expect(
            validateGraph(graph).noMultipleIdentifyingRelationsPerWeakEntity,
        ).toBe(true);
    });
    
    test("a weak entity cannot have more than one partial key", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.attributes.at(0).partialKey = true;
        weakEntity.attributes.at(1).partialKey = true;

        expect(weakEntitiesWithMoreThanOnePartialKey(graph)).toBe(true);
        expect(
            validateGraph(graph).noWeakEntitiesWithMoreThanOnePartialKey
        ).toBe(false);
    });    

    test("a weak entity with a single partial key should pass partial key uniqueness validation", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;
        weakEntity.attributes.forEach((attribute, index) => {
            attribute.partialKey = index === 0;
        });

        expect(weakEntitiesWithMoreThanOnePartialKey(graph)).toBe(false);
        expect(
            validateGraph(graph).noWeakEntitiesWithMoreThanOnePartialKey
        ).toBe(true);
    });
    test("a weak entity cannot have a regular primary key", () => {
        const weakEntity = graph.entities.at(0);

        weakEntity.weak = true;

        weakEntity.attributes.forEach((attribute, index) => {
            attribute.key = index === 0;
            attribute.partialKey = false;
        });

        expect(weakEntitiesWithPrimaryKey(graph)).toBe(true);
        expect(validateGraph(graph).noWeakEntitiesWithPrimaryKey).toBe(false);
    });
});

describe("Architecture", () => {
    test("mxgraph-js is not present in package.json nor imported in src/", () => {
        const root = process.cwd();

        // 1) package.json must not declare mxgraph-js
        const pkgPath = path.join(root, "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

        expect(deps["mxgraph-js"]).toBeUndefined();

        // 2) src/ must not contain mxgraph-js imports/requires
        const srcDir = path.join(root, "src");
        const offenders = [];

        const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(p);
            else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
            const raw = fs.readFileSync(p, "utf-8");
            if (raw.includes("mxgraph-js")) offenders.push(path.relative(root, p));
            }
        }
        };

        walk(srcDir);

        expect(offenders).toEqual([]);
    });
});