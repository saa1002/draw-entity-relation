import {
    findEntitiesByIdentifyingRelationId,
    findEntityById,
    findWeakEntityByIdentifyingRelationId,
    isWeakEntity,
} from "./entities";

const getRelations = (diagram) =>
    Array.isArray(diagram?.relations) ? diagram.relations : [];

export const POSSIBLE_CARDINALITIES = ["0:1", "0:N", "1:1", "1:N"];

export const TERNARY_RELATION_CARDINALITIES = ["0:1", "0:N"];

export const DEFAULT_IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITY = "0:N";

export const IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITIES = [
    DEFAULT_IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITY,
    "1:N",
];

export const IDENTIFYING_RELATION_STRONG_SIDE_CARDINALITY = "1:1";

export const findRelationById = (diagram, relationId) =>
    getRelations(diagram).find((relation) => relation.idMx === relationId) ??
    null;

export const findRelationIndexById = (diagram, relationId) =>
    getRelations(diagram).findIndex((relation) => relation.idMx === relationId);

export const isIdentifyingRelation = (relation) =>
    relation?.isIdentifying === true;

export const canRelationHoldAttributes = (relation) =>
    relation?.canHoldAttributes === true;

export const canRelationTypeHoldAttributes = (relation) =>
    isTernaryRelation(relation) ||
    (isBinaryRelation(relation) && isManyToManyRelation(relation));

export const RELATION_ARITIES = {
    BINARY: 2,
    TERNARY: 3,
};

export const BINARY_RELATION_SIDE_KEYS = ["side1", "side2"];
export const TERNARY_RELATION_SIDE_KEYS = ["side1", "side2", "side3"];

export const getRelationArity = (relation) =>
    relation?.arity === RELATION_ARITIES.TERNARY
        ? RELATION_ARITIES.TERNARY
        : RELATION_ARITIES.BINARY;

export const isBinaryRelation = (relation) =>
    getRelationArity(relation) === RELATION_ARITIES.BINARY;

export const isTernaryRelation = (relation) =>
    getRelationArity(relation) === RELATION_ARITIES.TERNARY;

export const getRelationSideKeys = (relation) =>
    isTernaryRelation(relation)
        ? TERNARY_RELATION_SIDE_KEYS
        : BINARY_RELATION_SIDE_KEYS;

export const getRelationSides = (relation) =>
    getRelationSideKeys(relation).map((sideKey) => relation?.[sideKey] ?? null);

export const getRelationEntityIds = (relation) =>
    getRelationSides(relation)
        .map((side) => side?.entity?.idMx ?? "")
        .filter(Boolean);

export const relationHasAllEntitySides = (relation) =>
    getRelationSides(relation).every((side) => !!side?.entity?.idMx);

export const relationHasBothEntitySides = relationHasAllEntitySides;

export const relationHasAllSideIds = (relation) =>
    getRelationSides(relation).every((side) => !!side?.idMx);

export const isRelationConfigured = (relation) =>
    relationHasAllEntitySides(relation) && relationHasAllSideIds(relation);

export const getRelationSideCardinality = (side = {}) => {
    const [minimum = "", maximum = ""] = String(side.cardinality ?? "").split(
        ":",
    );

    return {
        minimum,
        maximum,
    };
};

export const getRelationSideMaximum = (side) =>
    getRelationSideCardinality(side).maximum;

export const isSelfRelation = (relation) => {
    const entityIds = getRelationEntityIds(relation);

    return (
        relationHasBothEntitySides(relation) &&
        entityIds.length === getRelationSideKeys(relation).length &&
        entityIds.every((entityId) => entityId === entityIds[0])
    );
};

export const relationInvolvesEntity = (relation, entityId) =>
    !!entityId && getRelationEntityIds(relation).includes(entityId);

export const isManyToManyRelation = (relation) =>
    getRelationSides(relation).every(
        (side) => side?.cardinality?.endsWith(":N") === true,
    );

export const createEmptyRelationSide = ({ cardinality = "" } = {}) => ({
    idMx: "",
    cardinality,
    cell: "",
    edgeId: "",
    entity: { idMx: "" },
});

export const createRelationData = ({
    idMx = "",
    name = "",
    position = { x: 0, y: 0 },
    arity = RELATION_ARITIES.BINARY,
} = {}) => {
    const relation = {
        idMx,
        name,
        position,
        side1: createEmptyRelationSide(),
        side2: createEmptyRelationSide(),
        canHoldAttributes: false,
        isIdentifying: false,
        attributes: [],
    };

    if (arity === RELATION_ARITIES.TERNARY) {
        relation.arity = RELATION_ARITIES.TERNARY;
        relation.side3 = createEmptyRelationSide();
    }

    return relation;
};

export const resetRelationSides = (relation, { cardinality = "" } = {}) => {
    if (!relation) {
        return null;
    }

    getRelationSideKeys(relation).forEach((sideKey) => {
        relation[sideKey] = createEmptyRelationSide({ cardinality });
    });
    relation.canHoldAttributes = false;

    return relation;
};

export const isMandatoryOneToOneMergeRelation = (relation) => {
    if (isIdentifyingRelation(relation)) {
        return false;
    }

    if (isSelfRelation(relation)) {
        return false;
    }

    return (
        relation?.side1?.cardinality === "1:1" &&
        relation?.side2?.cardinality === "1:1"
    );
};

export const findMandatoryOneToOneMergeRelationForEntity = (
    diagram,
    entity,
) => {
    if (!diagram || !entity?.idMx) {
        return null;
    }

    return (
        getRelations(diagram).find(
            (relation) =>
                isMandatoryOneToOneMergeRelation(relation) &&
                relationInvolvesEntity(relation, entity.idMx),
        ) ?? null
    );
};

export const findWeakEntityForIdentifyingRelation = (diagram, relation) =>
    findWeakEntityByIdentifyingRelationId(diagram, relation?.idMx);

export const getWeakSideOfIdentifyingRelation = (diagram, relationData) => {
    const weakEntity = findWeakEntityForIdentifyingRelation(
        diagram,
        relationData,
    );

    if (!weakEntity) return null;

    if (relationData?.side1?.entity?.idMx === weakEntity.idMx) {
        return relationData.side1;
    }

    if (relationData?.side2?.entity?.idMx === weakEntity.idMx) {
        return relationData.side2;
    }

    return null;
};

export const getWeakAndStrongSidesForRelation = (diagram, relationData) => {
    const emptyResult = {
        weakEntity: null,
        strongEntity: null,
        weakSide: null,
        strongSide: null,
    };

    if (!relationData) {
        return emptyResult;
    }

    const side1Entity =
        findEntityById(diagram, relationData?.side1?.entity?.idMx) ?? null;

    const side2Entity =
        findEntityById(diagram, relationData?.side2?.entity?.idMx) ?? null;

    if (!side1Entity || !side2Entity) {
        return emptyResult;
    }

    if (side1Entity.idMx === side2Entity.idMx) {
        return emptyResult;
    }

    const makeResult = (weakEntity, ownerEntity, weakSide, ownerSide) => ({
        weakEntity,
        strongEntity: ownerEntity,
        weakSide,
        strongSide: ownerSide,
    });

    const side1IsWeak = isWeakEntity(side1Entity);
    const side2IsWeak = isWeakEntity(side2Entity);

    if (side1IsWeak && !side2IsWeak) {
        return makeResult(
            side1Entity,
            side2Entity,
            relationData.side1,
            relationData.side2,
        );
    }

    if (!side1IsWeak && side2IsWeak) {
        return makeResult(
            side2Entity,
            side1Entity,
            relationData.side2,
            relationData.side1,
        );
    }

    if (!side1IsWeak && !side2IsWeak) {
        return emptyResult;
    }

    if (side1IsWeak && side2IsWeak) {
        const side1AlreadyHasOwner =
            !!side1Entity.identifyingRelationId && !!side1Entity.ownerEntityId;

        const side2AlreadyHasOwner =
            !!side2Entity.identifyingRelationId && !!side2Entity.ownerEntityId;

        const side1CanBecomeDependent =
            !side1Entity.identifyingRelationId ||
            side1Entity.identifyingRelationId === relationData.idMx;

        const side2CanBecomeDependent =
            !side2Entity.identifyingRelationId ||
            side2Entity.identifyingRelationId === relationData.idMx;

        if (side1AlreadyHasOwner && side2CanBecomeDependent) {
            return makeResult(
                side2Entity,
                side1Entity,
                relationData.side2,
                relationData.side1,
            );
        }

        if (side2AlreadyHasOwner && side1CanBecomeDependent) {
            return makeResult(
                side1Entity,
                side2Entity,
                relationData.side1,
                relationData.side2,
            );
        }
    }

    const side1Maximum = getRelationSideMaximum(relationData.side1);
    const side2Maximum = getRelationSideMaximum(relationData.side2);

    if (side1Maximum === "N" && side2Maximum === "1") {
        return makeResult(
            side1Entity,
            side2Entity,
            relationData.side1,
            relationData.side2,
        );
    }

    if (side2Maximum === "N" && side1Maximum === "1") {
        return makeResult(
            side2Entity,
            side1Entity,
            relationData.side2,
            relationData.side1,
        );
    }

    if (
        side1Entity.identifyingRelationId === relationData.idMx &&
        side2Entity.identifyingRelationId !== relationData.idMx
    ) {
        return makeResult(
            side1Entity,
            side2Entity,
            relationData.side1,
            relationData.side2,
        );
    }

    if (
        side2Entity.identifyingRelationId === relationData.idMx &&
        side1Entity.identifyingRelationId !== relationData.idMx
    ) {
        return makeResult(
            side2Entity,
            side1Entity,
            relationData.side2,
            relationData.side1,
        );
    }

    return emptyResult;
};

export const getCascadedWeakConversionCandidate = (diagram, relationData) => {
    if (!relationData) return null;

    const side1Entity =
        findEntityById(diagram, relationData?.side1?.entity?.idMx) ?? null;

    const side2Entity =
        findEntityById(diagram, relationData?.side2?.entity?.idMx) ?? null;

    if (!side1Entity || !side2Entity) {
        return null;
    }

    if (side1Entity.idMx === side2Entity.idMx) {
        return null;
    }

    // This helper only handles the UX case where both entities are still strong.
    if (isWeakEntity(side1Entity) || isWeakEntity(side2Entity)) {
        return null;
    }

    const side1OwnsWeakEntities = diagram.entities.some(
        (entity) =>
            isWeakEntity(entity) &&
            entity.ownerEntityId === side1Entity.idMx &&
            !!entity.identifyingRelationId,
    );

    const side2OwnsWeakEntities = diagram.entities.some(
        (entity) =>
            isWeakEntity(entity) &&
            entity.ownerEntityId === side2Entity.idMx &&
            !!entity.identifyingRelationId,
    );

    // If none or both can be inferred, do not guess.
    if (side1OwnsWeakEntities === side2OwnsWeakEntities) {
        return null;
    }

    if (side1OwnsWeakEntities) {
        return {
            weakEntity: side1Entity,
            ownerEntity: side2Entity,
        };
    }

    return {
        weakEntity: side2Entity,
        ownerEntity: side1Entity,
    };
};

export const applyIdentifyingRelationCardinalities = (
    diagram,
    relationData,
) => {
    const { weakSide, strongSide } = getWeakAndStrongSidesForRelation(
        diagram,
        relationData,
    );

    if (!weakSide || !strongSide) {
        return false;
    }

    weakSide.cardinality = DEFAULT_IDENTIFYING_RELATION_WEAK_SIDE_CARDINALITY;
    strongSide.cardinality = IDENTIFYING_RELATION_STRONG_SIDE_CARDINALITY;

    return true;
};

export const clearIdentifyingRelationDomainSemantics = (
    diagram,
    relationId,
) => {
    if (!relationId) {
        return {
            relation: null,
            affectedEntities: [],
        };
    }

    const relation = findRelationById(diagram, relationId) ?? null;

    if (relation) {
        relation.isIdentifying = false;
    }

    const affectedEntities = findEntitiesByIdentifyingRelationId(
        diagram,
        relationId,
    );

    affectedEntities.forEach((entity) => {
        entity.identifyingRelationId = null;
        entity.ownerEntityId = null;
    });

    return {
        relation,
        affectedEntities,
    };
};
