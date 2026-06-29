import {
    getAttributeChildren,
    isLeafAttribute,
    isMultivaluedAttribute,
    isPartialKeyAttribute,
    isPrimaryKeyAttribute,
    walkAttributeTree,
} from "../er/attributes";

// Projects the editor's tree-shaped E/R attributes into relational columns.
// Composite attributes are flattened through their leaf attributes, while
// multivalued attributes are handled separately because they become their own tables.
const buildColumnNameFromLeaf = (attribute) => attribute.name;

// Returns the value columns for a multivalued attribute table. If the
// multivalued attribute is composite, each leaf child becomes one value column.
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

// Flattens regular attributes into relational columns. Attributes below a
// multivalued node are skipped here because multivalued attributes are mapped
// to their own tables later in the transformation.
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
