const getAttributes = (attributes) =>
    Array.isArray(attributes) ? attributes : [];

const getEntities = (diagram) =>
    Array.isArray(diagram?.entities) ? diagram.entities : [];

const getRelations = (diagram) =>
    Array.isArray(diagram?.relations) ? diagram.relations : [];

const ensureOwnerAttributes = (owner) => {
    if (!owner) {
        return [];
    }

    if (!Array.isArray(owner.attributes)) {
        owner.attributes = [];
    }

    return owner.attributes;
};

export const ATTRIBUTE_OWNER_TYPES = Object.freeze({
    ENTITY: "entity",
    RELATION: "relation",
});

export const DEFAULT_ATTRIBUTE_NAME = "Atributo";

export const findAttributeById = (attributes, attributeId) =>
    getAttributes(attributes).find(
        (attribute) => attribute.idMx === attributeId,
    ) ?? null;

export const findAttributeIndexById = (attributes, attributeId) =>
    getAttributes(attributes).findIndex(
        (attribute) => attribute.idMx === attributeId,
    );

export const findEntityByAttributeId = (diagram, attributeId) =>
    getEntities(diagram).find((entity) =>
        getAttributes(entity.attributes).some(
            (attribute) => attribute.idMx === attributeId,
        ),
    ) ?? null;

export const findRelationByAttributeId = (diagram, attributeId) =>
    getRelations(diagram).find((relation) =>
        getAttributes(relation.attributes).some(
            (attribute) => attribute.idMx === attributeId,
        ),
    ) ?? null;

export const findAttributeOwnerById = (diagram, attributeId) => {
    const entity = findEntityByAttributeId(diagram, attributeId);

    if (entity) {
        return {
            owner: entity,
            ownerType: ATTRIBUTE_OWNER_TYPES.ENTITY,
            attribute: findAttributeById(entity.attributes, attributeId),
        };
    }

    const relation = findRelationByAttributeId(diagram, attributeId);

    if (relation) {
        return {
            owner: relation,
            ownerType: ATTRIBUTE_OWNER_TYPES.RELATION,
            attribute: findAttributeById(relation.attributes, attributeId),
        };
    }

    return null;
};

export const findAttributeTreeOwnerById = (diagram, attributeId) => {
    for (const entity of getEntities(diagram)) {
        const node = findAttributeNodeInTreeById(
            entity.attributes,
            attributeId,
        );

        if (node) {
            return {
                owner: entity,
                ownerType: ATTRIBUTE_OWNER_TYPES.ENTITY,
                ...node,
            };
        }
    }

    for (const relation of getRelations(diagram)) {
        const node = findAttributeNodeInTreeById(
            relation.attributes,
            attributeId,
        );

        if (node) {
            return {
                owner: relation,
                ownerType: ATTRIBUTE_OWNER_TYPES.RELATION,
                ...node,
            };
        }
    }

    return null;
};

export const isPrimaryKeyAttribute = (attribute) => attribute?.key === true;

export const isPartialKeyAttribute = (attribute) =>
    attribute?.partialKey === true;

export const isEntityAttributeOwner = (attributeOwner) =>
    attributeOwner?.ownerType === ATTRIBUTE_OWNER_TYPES.ENTITY;

export const isRelationAttributeOwner = (attributeOwner) =>
    attributeOwner?.ownerType === ATTRIBUTE_OWNER_TYPES.RELATION;

export const findPrimaryKeyAttribute = (attributes) =>
    getAttributes(attributes).find(isPrimaryKeyAttribute) ?? null;

export const findPrimaryKeyAttributes = (attributes) =>
    getAttributes(attributes).filter(isPrimaryKeyAttribute);

export const findPartialKeyAttribute = (attributes) =>
    getAttributes(attributes).find(isPartialKeyAttribute) ?? null;

export const findPartialKeyAttributes = (attributes) =>
    getAttributes(attributes).filter(isPartialKeyAttribute);

export const hasPrimaryKeyAttribute = (attributes) =>
    findPrimaryKeyAttribute(attributes) !== null;

export const hasPartialKeyAttribute = (attributes) =>
    findPartialKeyAttribute(attributes) !== null;

export const getAttributeList = getAttributes;

export const getAttributeCellIds = (attribute) =>
    Array.isArray(attribute?.cell) ? attribute.cell.filter(Boolean) : [];

export const getAttributeCount = (attributes) =>
    getAttributes(attributes).length;

export const isFirstAttributeForOwner = (owner) =>
    getAttributeCount(owner?.attributes) === 0;

export const getLastAttribute = (attributes) => {
    const safeAttributes = getAttributes(attributes);

    return safeAttributes.at(-1) ?? null;
};

export const generateUniqueAttributeName = (
    attributes,
    baseName = DEFAULT_ATTRIBUTE_NAME,
) => {
    const existingNames = new Set(
        getAttributes(attributes).map((attribute) => attribute.name),
    );

    let counter = 0;
    let candidateName = baseName;

    while (existingNames.has(candidateName)) {
        counter += 1;
        candidateName = `${baseName} ${counter}`;
    }

    return candidateName;
};

export const getDefaultAttributeSemantics = ({
    ownerType,
    isFirstAttribute,
    isWeakEntityOwner = false,
}) => {
    const belongsToEntity = ownerType === ATTRIBUTE_OWNER_TYPES.ENTITY;

    return {
        key: belongsToEntity && !isWeakEntityOwner && isFirstAttribute,
        partialKey: belongsToEntity && isWeakEntityOwner && isFirstAttribute,
    };
};

export const createAttribute = ({
    idMx,
    name,
    position,
    key = false,
    partialKey = false,
    cell,
    offsetX = 0,
    offsetY = 0,
}) => ({
    idMx,
    name,
    position,
    key,
    partialKey,
    cell,
    offsetX,
    offsetY,
});

export const addAttributeToOwner = (owner, attribute) => {
    if (!owner || !attribute) {
        return null;
    }

    const attributes = ensureOwnerAttributes(owner);

    attributes.push(attribute);

    return attribute;
};

export const addChildAttributeToAttribute = (
    parentAttribute,
    childAttribute,
) => {
    if (!parentAttribute || !childAttribute) {
        return null;
    }

    if (!Array.isArray(parentAttribute.children)) {
        parentAttribute.children = [];
    }

    parentAttribute.children.push(childAttribute);

    return childAttribute;
};

export const removeAttributeFromOwnerById = (owner, attributeId) => {
    if (!owner) {
        return null;
    }

    const attributes = ensureOwnerAttributes(owner);
    const attributeIndex = findAttributeIndexById(attributes, attributeId);

    if (attributeIndex === -1) {
        return null;
    }

    const [removedAttribute] = attributes.splice(attributeIndex, 1);

    return removedAttribute ?? null;
};

const removeAttributeFromListById = (attributes, attributeId) => {
    const attributeIndex = findAttributeIndexById(attributes, attributeId);

    if (attributeIndex !== -1) {
        const [removedAttribute] = attributes.splice(attributeIndex, 1);

        return removedAttribute ?? null;
    }

    for (const attribute of getAttributes(attributes)) {
        if (!Array.isArray(attribute.children)) {
            continue;
        }

        const removedAttribute = removeAttributeFromListById(
            attribute.children,
            attributeId,
        );

        if (removedAttribute) {
            return removedAttribute;
        }
    }

    return null;
};

export const removeAttributeFromOwnerTreeById = (owner, attributeId) => {
    if (!owner) {
        return null;
    }

    return removeAttributeFromListById(
        ensureOwnerAttributes(owner),
        attributeId,
    );
};

export const removeAllAttributesFromOwner = (owner) => {
    if (!owner) {
        return [];
    }

    const removedAttributes = [...getAttributes(owner.attributes)];

    owner.attributes = [];

    return removedAttributes;
};

export const updateAttributePosition = ({ attribute, owner, position }) => {
    if (!attribute || !owner || !position) {
        return null;
    }

    const ownerX = typeof owner.position?.x === "number" ? owner.position.x : 0;

    const ownerY = typeof owner.position?.y === "number" ? owner.position.y : 0;

    const positionX = typeof position.x === "number" ? position.x : 0;

    const positionY = typeof position.y === "number" ? position.y : 0;

    attribute.position = {
        x: position.x,
        y: position.y,
    };

    attribute.offsetX = position.x - ownerX;
    attribute.offsetY = position.y - ownerY;

    return attribute;
};

export const toggleExclusivePrimaryKeyAttribute = (attributes, attributeId) => {
    const selectedAttribute = findAttributeById(attributes, attributeId);

    if (!selectedAttribute) {
        return {
            updated: false,
            enabled: false,
            changedAttributes: [],
        };
    }

    const shouldSetAsKey = !selectedAttribute.key;
    const changedAttributes = [];

    getAttributes(attributes).forEach((attribute) => {
        const previousKey = attribute.key;
        const previousPartialKey = attribute.partialKey;

        if (shouldSetAsKey) {
            attribute.key = attribute.idMx === attributeId;
            attribute.partialKey = false;
        } else if (attribute.idMx === attributeId) {
            attribute.key = false;
            attribute.partialKey = false;
        }

        if (
            previousKey !== attribute.key ||
            previousPartialKey !== attribute.partialKey
        ) {
            changedAttributes.push(attribute);
        }
    });

    return {
        updated: true,
        enabled: shouldSetAsKey,
        changedAttributes,
    };
};

export const toggleExclusivePartialKeyAttribute = (attributes, attributeId) => {
    const selectedAttribute = findAttributeById(attributes, attributeId);

    if (!selectedAttribute) {
        return {
            updated: false,
            enabled: false,
            changedAttributes: [],
        };
    }

    const shouldSetAsPartialKey = !selectedAttribute.partialKey;
    const changedAttributes = [];

    getAttributes(attributes).forEach((attribute) => {
        const previousKey = attribute.key;
        const previousPartialKey = attribute.partialKey;

        if (shouldSetAsPartialKey) {
            attribute.partialKey = attribute.idMx === attributeId;
            attribute.key = false;
        } else if (attribute.idMx === attributeId) {
            attribute.partialKey = false;
            attribute.key = false;
        }

        if (
            previousKey !== attribute.key ||
            previousPartialKey !== attribute.partialKey
        ) {
            changedAttributes.push(attribute);
        }
    });

    return {
        updated: true,
        enabled: shouldSetAsPartialKey,
        changedAttributes,
    };
};

export const convertPrimaryKeyToPartialKey = (attributes) => {
    const discriminantCandidate =
        getAttributes(attributes).find(isPrimaryKeyAttribute) ??
        getAttributes(attributes).find(isPartialKeyAttribute) ??
        null;

    const changedAttributes = [];

    getAttributes(attributes).forEach((attribute) => {
        const previousKey = attribute.key;
        const previousPartialKey = attribute.partialKey;

        attribute.key = false;
        attribute.partialKey = discriminantCandidate?.idMx === attribute.idMx;

        if (
            previousKey !== attribute.key ||
            previousPartialKey !== attribute.partialKey
        ) {
            changedAttributes.push(attribute);
        }
    });

    return changedAttributes;
};

export const convertPartialKeyToPrimaryKey = (attributes) => {
    const primaryKeyCandidate =
        getAttributes(attributes).find(isPartialKeyAttribute) ??
        getAttributes(attributes).find(isPrimaryKeyAttribute) ??
        null;

    const changedAttributes = [];

    getAttributes(attributes).forEach((attribute) => {
        const previousKey = attribute.key;
        const previousPartialKey = attribute.partialKey;

        attribute.partialKey = false;
        attribute.key = primaryKeyCandidate?.idMx === attribute.idMx;

        if (
            previousKey !== attribute.key ||
            previousPartialKey !== attribute.partialKey
        ) {
            changedAttributes.push(attribute);
        }
    });

    return changedAttributes;
};

export const getAttributeChildren = (attribute) =>
    getAttributes(attribute?.children);

export const isCompositeAttribute = (attribute) =>
    !!attribute && getAttributeChildren(attribute).length > 0;

export const isLeafAttribute = (attribute) =>
    !!attribute && !isCompositeAttribute(attribute);

export const isMultivaluedAttribute = (attribute) =>
    attribute?.multivalued === true;

export const isCompositeMultivaluedAttribute = (attribute) =>
    isCompositeAttribute(attribute) && isMultivaluedAttribute(attribute);

export const walkAttributeTree = (attributes, visitor) => {
    if (typeof visitor !== "function") {
        return;
    }

    const visit = (
        currentAttributes,
        parent = null,
        depth = 0,
        ancestors = [],
    ) => {
        getAttributes(currentAttributes).forEach((attribute, index) => {
            visitor(attribute, {
                parent,
                depth,
                index,
                ancestors,
            });

            visit(getAttributeChildren(attribute), attribute, depth + 1, [
                ...ancestors,
                attribute,
            ]);
        });
    };

    visit(attributes);
};

export const flattenAttributeTree = (attributes) => {
    const flattenedAttributes = [];

    walkAttributeTree(attributes, (attribute) => {
        flattenedAttributes.push(attribute);
    });

    return flattenedAttributes;
};

export const getLeafAttributes = (attributes) =>
    flattenAttributeTree(attributes).filter(isLeafAttribute);

export const findAttributeInTreeById = (attributes, attributeId) =>
    flattenAttributeTree(attributes).find(
        (attribute) => attribute.idMx === attributeId,
    ) ?? null;

export const findAttributeNodeInTreeById = (attributes, attributeId) => {
    let foundNode = null;

    walkAttributeTree(attributes, (attribute, context) => {
        if (!foundNode && attribute.idMx === attributeId) {
            foundNode = {
                attribute,
                ...context,
            };
        }
    });

    return foundNode;
};
