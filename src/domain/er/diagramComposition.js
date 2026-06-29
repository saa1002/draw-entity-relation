import { normalizeDiagramData } from "./diagramNormalization";
import { getRelationSideKeys } from "./relations";

// Diagram composition supports replacing the current diagram or merging an
// imported one. Merge mode must remap ids, offset positions and rename conflicts
// so both diagrams can coexist safely on the same canvas.
export const DIAGRAM_COMPOSITION_MODES = Object.freeze({
    REPLACE: "replace",
    MERGE: "merge",
});

const MERGE_HORIZONTAL_SPACING = 180;

const cloneDiagram = (diagram) =>
    normalizeDiagramData(JSON.parse(JSON.stringify(diagram ?? {})));

const hasUsableId = (id) => id !== null && id !== undefined && id !== "";

const addId = (ids, id) => {
    if (hasUsableId(id)) {
        ids.add(String(id));
    }
};

const collectAttributeIds = (attribute, ids) => {
    addId(ids, attribute?.idMx);
    addId(ids, attribute?.cell?.[0]);
    addId(ids, attribute?.cell?.[1]);

    if (Array.isArray(attribute?.children)) {
        attribute.children.forEach((childAttribute) =>
            collectAttributeIds(childAttribute, ids),
        );
    }
};

const collectRelationSideIds = (side, ids) => {
    addId(ids, side?.idMx);
    addId(ids, side?.cell);
    addId(ids, side?.edgeId);
    addId(ids, side?.entity?.idMx);
};

const collectDiagramIds = (diagram) => {
    const ids = new Set();

    diagram.entities.forEach((entity) => {
        addId(ids, entity.idMx);
        addId(ids, entity.ownerEntityId);
        addId(ids, entity.identifyingRelationId);

        entity.attributes.forEach((attribute) =>
            collectAttributeIds(attribute, ids),
        );
    });

    diagram.relations.forEach((relation) => {
        addId(ids, relation.idMx);

        getRelationSideKeys(relation).forEach((sideKey) => {
            collectRelationSideIds(relation[sideKey], ids);
        });

        relation.attributes.forEach((attribute) =>
            collectAttributeIds(attribute, ids),
        );
    });

    diagram.isas.forEach((isa) => {
        addId(ids, isa.idMx);
        addId(ids, isa.generalization?.edgeId);
        addId(ids, isa.generalization?.entity?.idMx);

        isa.specializations.forEach((specialization) => {
            addId(ids, specialization.edgeId);
            addId(ids, specialization.entity?.idMx);
        });
    });

    return ids;
};

// Creates stable replacement ids for the imported diagram. The same original id
// must always map to the same new id to preserve internal references.
const createIdRemapper = (usedIds) => {
    const idMap = new Map();
    let counter = 0;

    return (id) => {
        if (!hasUsableId(id)) {
            return id;
        }

        const originalId = String(id);

        if (idMap.has(originalId)) {
            return idMap.get(originalId);
        }

        let candidateId;

        do {
            counter += 1;
            candidateId = `merged-${counter}-${originalId}`;
        } while (usedIds.has(candidateId));

        usedIds.add(candidateId);
        idMap.set(originalId, candidateId);

        return candidateId;
    };
};

const hasFinitePosition = (position) =>
    Number.isFinite(position?.x) && Number.isFinite(position?.y);

const collectAttributePositions = (attributes = []) =>
    attributes.flatMap((attribute) => [
        ...(hasFinitePosition(attribute.position) ? [attribute.position] : []),
        ...(Array.isArray(attribute.children)
            ? collectAttributePositions(attribute.children)
            : []),
    ]);

const collectDiagramPositions = (diagram) => [
    ...diagram.entities.flatMap((entity) => [
        ...(hasFinitePosition(entity.position) ? [entity.position] : []),
        ...collectAttributePositions(entity.attributes),
    ]),
    ...diagram.relations.flatMap((relation) => [
        ...(hasFinitePosition(relation.position) ? [relation.position] : []),
        ...collectAttributePositions(relation.attributes),
    ]),
    ...diagram.isas.flatMap((isa) =>
        hasFinitePosition(isa.position) ? [isa.position] : [],
    ),
];

const getDiagramBounds = (diagram) => {
    const positions = collectDiagramPositions(diagram);

    if (positions.length === 0) {
        return null;
    }

    return positions.reduce(
        (bounds, position) => ({
            minX: Math.min(bounds.minX, position.x),
            maxX: Math.max(bounds.maxX, position.x),
            minY: Math.min(bounds.minY, position.y),
            maxY: Math.max(bounds.maxY, position.y),
        }),
        {
            minX: positions[0].x,
            maxX: positions[0].x,
            minY: positions[0].y,
            maxY: positions[0].y,
        },
    );
};

// Places the imported diagram to the right of the current diagram to reduce
// visual overlap after a merge.
const getMergeOffset = (currentDiagram, importedDiagram) => {
    const currentBounds = getDiagramBounds(currentDiagram);
    const importedBounds = getDiagramBounds(importedDiagram);

    if (!currentBounds || !importedBounds) {
        return { x: 0, y: 0 };
    }

    return {
        x: currentBounds.maxX - importedBounds.minX + MERGE_HORIZONTAL_SPACING,
        y: currentBounds.minY - importedBounds.minY,
    };
};

const offsetPosition = (position, offset) => ({
    x: position.x + offset.x,
    y: position.y + offset.y,
});

const getUniqueSuffixedName = (name, usedNames) => {
    let counter = 0;
    let candidateName = name;

    while (usedNames.has(candidateName)) {
        counter += 1;
        candidateName = `${name} (${counter})`;
    }

    usedNames.add(candidateName);

    return candidateName;
};

const renameAttributeSiblings = (attributes = []) => {
    const usedNames = new Set();

    return attributes.map((attribute) => {
        const renamedAttribute = {
            ...attribute,
            name: getUniqueSuffixedName(attribute.name, usedNames),
        };

        if (Array.isArray(attribute.children)) {
            renamedAttribute.children = renameAttributeSiblings(
                attribute.children,
            );
        }

        return renamedAttribute;
    });
};

// Entity and relation names share the SQL table namespace, so imported conflicts
// are renamed before merging. Attribute conflicts are resolved among siblings.
const renameImportedDiagramConflicts = (currentDiagram, importedDiagram) => {
    const usedElementNames = new Set([
        ...currentDiagram.entities.map((entity) => entity.name),
        ...currentDiagram.relations.map((relation) => relation.name),
    ]);

    return {
        ...importedDiagram,
        entities: importedDiagram.entities.map((entity) => ({
            ...entity,
            name: getUniqueSuffixedName(entity.name, usedElementNames),
            attributes: renameAttributeSiblings(entity.attributes),
        })),
        relations: importedDiagram.relations.map((relation) => ({
            ...relation,
            name: getUniqueSuffixedName(relation.name, usedElementNames),
            attributes: renameAttributeSiblings(relation.attributes),
        })),
    };
};

const remapAttribute = (attribute, remapId, offset) => {
    const remappedAttribute = {
        ...attribute,
        idMx: remapId(attribute.idMx),
        position: offsetPosition(attribute.position, offset),
        cell: [remapId(attribute.cell?.[0]), remapId(attribute.cell?.[1])],
    };

    if (Array.isArray(attribute.children)) {
        remappedAttribute.children = attribute.children.map((childAttribute) =>
            remapAttribute(childAttribute, remapId, offset),
        );
    }

    return remappedAttribute;
};

const remapRelationSide = (side, remapId) => ({
    ...side,
    idMx: remapId(side.idMx),
    cell: remapId(side.cell),
    edgeId: remapId(side.edgeId),
    entity: {
        ...side.entity,
        idMx: remapId(side.entity?.idMx),
    },
});

const remapRelation = (relation, remapId, offset) => {
    const remappedRelation = {
        ...relation,
        idMx: remapId(relation.idMx),
        position: offsetPosition(relation.position, offset),
        attributes: relation.attributes.map((attribute) =>
            remapAttribute(attribute, remapId, offset),
        ),
    };

    getRelationSideKeys(relation).forEach((sideKey) => {
        remappedRelation[sideKey] = remapRelationSide(
            relation[sideKey],
            remapId,
        );
    });

    return remappedRelation;
};

const remapIsaLink = (link, remapId) => ({
    ...link,
    edgeId: remapId(link.edgeId),
    entity: {
        ...link.entity,
        idMx: remapId(link.entity?.idMx),
    },
});

const remapImportedDiagram = (importedDiagram, remapId, offset) => ({
    entities: importedDiagram.entities.map((entity) => ({
        ...entity,
        idMx: remapId(entity.idMx),
        ownerEntityId: remapId(entity.ownerEntityId),
        identifyingRelationId: remapId(entity.identifyingRelationId),
        position: offsetPosition(entity.position, offset),
        attributes: entity.attributes.map((attribute) =>
            remapAttribute(attribute, remapId, offset),
        ),
    })),
    relations: importedDiagram.relations.map((relation) =>
        remapRelation(relation, remapId, offset),
    ),
    isas: importedDiagram.isas.map((isa) => ({
        ...isa,
        idMx: remapId(isa.idMx),
        position: offsetPosition(isa.position, offset),
        generalization: remapIsaLink(isa.generalization, remapId),
        specializations: isa.specializations.map((specialization) =>
            remapIsaLink(specialization, remapId),
        ),
    })),
});

export const mergeDiagramData = (currentDiagram, importedDiagram) => {
    const normalizedCurrentDiagram = cloneDiagram(currentDiagram);
    const normalizedImportedDiagram = cloneDiagram(importedDiagram);

    const renamedImportedDiagram = renameImportedDiagramConflicts(
        normalizedCurrentDiagram,
        normalizedImportedDiagram,
    );

    const usedIds = collectDiagramIds(normalizedCurrentDiagram);
    const remapId = createIdRemapper(usedIds);
    const offset = getMergeOffset(
        normalizedCurrentDiagram,
        renamedImportedDiagram,
    );

    const remappedImportedDiagram = remapImportedDiagram(
        renamedImportedDiagram,
        remapId,
        offset,
    );

    return normalizeDiagramData({
        entities: [
            ...normalizedCurrentDiagram.entities,
            ...remappedImportedDiagram.entities,
        ],
        relations: [
            ...normalizedCurrentDiagram.relations,
            ...remappedImportedDiagram.relations,
        ],
        isas: [
            ...normalizedCurrentDiagram.isas,
            ...remappedImportedDiagram.isas,
        ],
    });
};

export const composeDiagramData = ({
    currentDiagram,
    importedDiagram,
    mode = DIAGRAM_COMPOSITION_MODES.REPLACE,
}) => {
    if (mode === DIAGRAM_COMPOSITION_MODES.MERGE) {
        return mergeDiagramData(currentDiagram, importedDiagram);
    }

    return cloneDiagram(importedDiagram);
};
