import { describe, expect, test } from "vitest";

import {
    canAddChildAttributeToSelection,
    canConvertSelectedSubattributeToSimple,
    getEntityAttributeKeySelectionData,
    getEntityMultivaluedAttributeSelectionData,
    getSimpleEntityAttributesGroupingSelectionData,
} from "../../../src/components/DiagramEditor/utils/selection/attributeSelection";
import { ATTRIBUTE_OWNER_TYPES } from "../../../src/domain/er";

const attributeCell = (id) => ({
    id,
    style: "shape=ellipse",
});

const relationCell = (id) => ({
    id,
    style: "shape=rhombus",
});

const createDiagram = ({ entities = [], relations = [] } = {}) => ({
    entities,
    relations,
});

describe("attribute selection helpers", () => {
    test("resolves the root attribute when selecting a composite child for key actions", () => {
        const street = { idMx: "attr-street", name: "street" };
        const address = {
            idMx: "attr-address",
            name: "address",
            children: [street],
        };
        const entity = {
            idMx: "entity-person",
            attributes: [address],
        };

        const result = getEntityAttributeKeySelectionData({
            diagram: createDiagram({ entities: [entity] }),
            selectedCell: attributeCell("attr-street"),
        });

        expect(result.entity).toBe(entity);
        expect(result.attribute).toBe(address);
        expect(result.selectedAttribute).toBe(street);
    });

    test("ignores relation attributes for entity key actions", () => {
        const relationAttribute = { idMx: "attr-date", name: "date" };
        const relation = {
            idMx: "relation-works",
            attributes: [relationAttribute],
        };

        const result = getEntityAttributeKeySelectionData({
            diagram: createDiagram({ relations: [relation] }),
            selectedCell: attributeCell("attr-date"),
        });

        expect(result).toBeNull();
    });

    test("resolves the root attribute for multivalued composite actions", () => {
        const prefix = { idMx: "attr-prefix", name: "prefix" };
        const phones = {
            idMx: "attr-phones",
            name: "phones",
            multivalued: true,
            children: [prefix],
        };
        const entity = {
            idMx: "entity-person",
            attributes: [phones],
        };

        const result = getEntityMultivaluedAttributeSelectionData({
            diagram: createDiagram({ entities: [entity] }),
            selectedCell: attributeCell("attr-prefix"),
        });

        expect(result.owner).toBe(entity);
        expect(result.attribute).toBe(phones);
        expect(result.selectedAttribute).toBe(prefix);
        expect(result.isCompositeMultivaluedTarget).toBe(true);
    });

    test("accepts grouping only simple root attributes from the same entity", () => {
        const name = { idMx: "attr-name", name: "name" };
        const surname = { idMx: "attr-surname", name: "surname" };
        const entity = {
            idMx: "entity-person",
            attributes: [name, surname],
        };

        const result = getSimpleEntityAttributesGroupingSelectionData({
            diagram: createDiagram({ entities: [entity] }),
            selectionCells: [
                attributeCell("attr-name"),
                attributeCell("attr-surname"),
            ],
        });

        expect(result.owner).toBe(entity);
        expect(result.attributeOwners.map(({ attribute }) => attribute)).toEqual([
            name,
            surname,
        ]);
    });

    test("rejects grouping keys, nested attributes and non-attribute cells", () => {
        const id = { idMx: "attr-id", name: "id", key: true };
        const street = { idMx: "attr-street", name: "street" };
        const address = {
            idMx: "attr-address",
            name: "address",
            children: [street],
        };
        const entity = {
            idMx: "entity-person",
            attributes: [id, address],
        };
        const diagram = createDiagram({ entities: [entity] });

        expect(
            getSimpleEntityAttributesGroupingSelectionData({
                diagram,
                selectionCells: [
                    attributeCell("attr-id"),
                    attributeCell("attr-address"),
                ],
            }),
        ).toBeNull();

        expect(
            getSimpleEntityAttributesGroupingSelectionData({
                diagram,
                selectionCells: [
                    attributeCell("attr-street"),
                    attributeCell("attr-id"),
                ],
            }),
        ).toBeNull();

        expect(
            getSimpleEntityAttributesGroupingSelectionData({
                diagram,
                selectionCells: [
                    attributeCell("attr-id"),
                    relationCell("relation-1"),
                ],
            }),
        ).toBeNull();
    });

    test("allows adding children to entity composite multivalued attributes but not to relation ones", () => {
        const compositeMultivalued = {
            idMx: "attr-phones",
            name: "phones",
            multivalued: true,
            children: [{ idMx: "attr-prefix", name: "prefix" }],
        };

        expect(
            canAddChildAttributeToSelection({
                ownerType: ATTRIBUTE_OWNER_TYPES.ENTITY,
                attribute: compositeMultivalued,
                depth: 0,
            }),
        ).toBe(true);

        expect(
            canAddChildAttributeToSelection({
                ownerType: ATTRIBUTE_OWNER_TYPES.RELATION,
                attribute: compositeMultivalued,
                depth: 0,
            }),
        ).toBe(false);
    });

    test("allows converting only direct subattributes back to simple attributes", () => {
        expect(
            canConvertSelectedSubattributeToSimple({
                parent: { idMx: "attr-address" },
                depth: 1,
            }),
        ).toBe(true);

        expect(
            canConvertSelectedSubattributeToSimple({
                parent: { idMx: "attr-address" },
                depth: 2,
            }),
        ).toBe(false);
    });
});