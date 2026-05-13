import {
    getAttributeChildren,
    isLeafAttribute,
    isMultivaluedAttribute,
    isPartialKeyAttribute,
    isPrimaryKeyAttribute,
    walkAttributeTree,
} from "../er/attributes";

const buildColumnNameFromLeaf = (attribute) => attribute.name;

export const projectMultivaluedAttributeToColumns = (attribute) => {
    if (isLeafAttribute(attribute)) {
        return [
            {
                name: buildColumnNameFromLeaf(attribute),
            },
        ];
    }

    const columns = [];

    walkAttributeTree(getAttributeChildren(attribute), (leafAttribute) => {
        if (!isLeafAttribute(leafAttribute)) {
            return;
        }

        columns.push({
            name: buildColumnNameFromLeaf(leafAttribute),
        });
    });

    return columns;
};

export const projectAttributeTreeToColumns = (attributes) => {
    const columns = [];

    walkAttributeTree(attributes, (attribute, { ancestors }) => {
        const path = [...ancestors, attribute];

        if (!isLeafAttribute(attribute) || path.some(isMultivaluedAttribute)) {
            return;
        }

        columns.push({
            name: buildColumnNameFromLeaf(attribute),
            key: path.some(isPrimaryKeyAttribute),
            partialKey: path.some(isPartialKeyAttribute),
        });
    });

    return columns;
};
