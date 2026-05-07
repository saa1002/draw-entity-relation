export const findAttributeById = (attributes, attributeId) =>
    attributes.find((attribute) => attribute.idMx === attributeId) ?? null;

export const isPrimaryKeyAttribute = (attribute) => attribute?.key === true;

export const isPartialKeyAttribute = (attribute) =>
    attribute?.partialKey === true;
