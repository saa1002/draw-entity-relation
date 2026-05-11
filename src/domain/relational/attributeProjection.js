import {
    isLeafAttribute,
    isPartialKeyAttribute,
    isPrimaryKeyAttribute,
    walkAttributeTree,
} from "../er/attributes";

const buildColumnNameFromPath = (path) =>
    path.map((attribute) => attribute.name).join("_");

export const projectAttributeTreeToColumns = (attributes) => {
    const columns = [];

    walkAttributeTree(attributes, (attribute, { ancestors }) => {
        if (!isLeafAttribute(attribute)) {
            return;
        }

        const path = [...ancestors, attribute];

        columns.push({
            name: buildColumnNameFromPath(path),
            key: path.some(isPrimaryKeyAttribute),
            partialKey: path.some(isPartialKeyAttribute),
        });
    });

    return columns;
};
