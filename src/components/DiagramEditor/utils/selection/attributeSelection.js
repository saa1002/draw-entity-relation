import {
    findAttributeTreeOwnerById,
    getAttributeChildren,
    isCompositeAttribute,
    isEntityAttributeOwner,
    isMultivaluedAttribute,
} from "../../../../domain/er";
import { isAttributeShapeCell } from "../mxStyles/diagramStyles";

const getRootAttribute = (attributeOwner) =>
    attributeOwner?.ancestors?.at(0) ?? attributeOwner?.attribute;

export const getEntityAttributeKeySelectionData = ({
    diagram,
    selectedCell,
}) => {
    const attributeOwner = findAttributeTreeOwnerById(
        diagram,
        selectedCell?.id,
    );

    if (!isEntityAttributeOwner(attributeOwner)) {
        return null;
    }

    return {
        entity: attributeOwner.owner,
        attribute: getRootAttribute(attributeOwner),
        selectedAttribute: attributeOwner.attribute,
    };
};

export const getEntityMultivaluedAttributeSelectionData = ({
    diagram,
    selectedCell,
}) => {
    if (!selectedCell || !isAttributeShapeCell(selectedCell)) {
        return null;
    }

    const attributeOwner = findAttributeTreeOwnerById(diagram, selectedCell.id);

    if (!attributeOwner || !isEntityAttributeOwner(attributeOwner)) {
        return null;
    }

    const rootAttribute = getRootAttribute(attributeOwner);
    const selectedAttribute = attributeOwner.attribute;
    const rootChildren = getAttributeChildren(rootAttribute);

    return {
        ...attributeOwner,
        attribute: rootAttribute,
        selectedAttribute,
        isCompositeMultivaluedTarget: rootChildren.length > 0,
    };
};

export const getSimpleEntityAttributesGroupingSelectionData = ({
    diagram,
    selectionCells,
}) => {
    if (
        selectionCells.length < 2 ||
        !selectionCells.every(isAttributeShapeCell)
    ) {
        return null;
    }

    const selectedAttributeOwners = selectionCells
        .map((cell) => findAttributeTreeOwnerById(diagram, cell.id))
        .filter(Boolean);

    if (selectedAttributeOwners.length !== selectionCells.length) {
        return null;
    }

    if (!selectedAttributeOwners.every(isEntityAttributeOwner)) {
        return null;
    }

    const [firstAttributeOwner] = selectedAttributeOwners;
    const owner = firstAttributeOwner.owner;

    const allAttributesBelongToSameEntity = selectedAttributeOwners.every(
        (attributeOwner) => attributeOwner.owner?.idMx === owner?.idMx,
    );

    if (!allAttributesBelongToSameEntity) {
        return null;
    }

    const allAttributesAreGroupable = selectedAttributeOwners.every(
        ({ attribute, depth }) =>
            depth === 0 &&
            !isCompositeAttribute(attribute) &&
            !isMultivaluedAttribute(attribute) &&
            !attribute.key &&
            !attribute.partialKey,
    );

    if (!allAttributesAreGroupable) {
        return null;
    }

    const uniqueAttributeOwners = [];
    const seenAttributeIds = new Set();

    selectedAttributeOwners.forEach((attributeOwner) => {
        const attributeId = attributeOwner.attribute?.idMx;

        if (!attributeId || seenAttributeIds.has(attributeId)) {
            return;
        }

        seenAttributeIds.add(attributeId);
        uniqueAttributeOwners.push(attributeOwner);
    });

    if (uniqueAttributeOwners.length < 2) {
        return null;
    }

    return {
        owner,
        attributeOwners: uniqueAttributeOwners,
    };
};

export const getCompositeAttributeSelectionTarget = (attributeOwner) => {
    if (!attributeOwner || attributeOwner.depth > 1) {
        return null;
    }

    const compositeAttribute =
        attributeOwner.depth === 0
            ? attributeOwner.attribute
            : attributeOwner.parent;

    if (!compositeAttribute) {
        return null;
    }

    return {
        ...attributeOwner,
        compositeAttribute,
    };
};

export const canAddChildAttributeToSelection = (attributeOwner) => {
    const selectedCompositeTarget =
        getCompositeAttributeSelectionTarget(attributeOwner);

    if (!selectedCompositeTarget) {
        return false;
    }

    const { compositeAttribute } = selectedCompositeTarget;

    if (!isMultivaluedAttribute(compositeAttribute)) {
        return true;
    }

    return (
        isCompositeAttribute(compositeAttribute) &&
        isEntityAttributeOwner(attributeOwner) &&
        !compositeAttribute.key &&
        !compositeAttribute.partialKey
    );
};

export const canConvertSelectedSubattributeToSimple = (attributeOwner) =>
    attributeOwner?.parent && attributeOwner.depth === 1;
