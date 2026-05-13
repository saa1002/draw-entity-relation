import {
    getAttributeChildren,
    isLeafAttribute,
    isMultivaluedAttribute,
    isPartialKeyAttribute,
    isPrimaryKeyAttribute,
    walkAttributeTree,
} from "../er/attributes";

const buildColumnNameFromPath = (path) =>
    path.map((attribute) => attribute.name).join("_");

export const projectMultivaluedAttributeToColumns = (attribute) => {
    if (isLeafAttribute(attribute)) {
        return [
            {
                name: buildColumnNameFromPath([attribute]),
            },
        ];
    }

    const columns = [];

    walkAttributeTree(
        getAttributeChildren(attribute),
        (leafAttribute, { ancestors }) => {
            if (!isLeafAttribute(leafAttribute)) {
                return;
            }

            columns.push({
                name: buildColumnNameFromPath([
                    attribute,
                    ...ancestors,
                    leafAttribute,
                ]),
            });
        },
    );

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
            name: buildColumnNameFromPath(path),
            key: path.some(isPrimaryKeyAttribute),
            partialKey: path.some(isPartialKeyAttribute),
        });
    });

    return columns;
};
