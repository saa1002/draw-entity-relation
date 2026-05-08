import {
    findEntityById,
    findWeakEntityByIdentifyingRelationId,
    isWeakEntity,
} from "./entities";

const getRelations = (diagram) =>
    Array.isArray(diagram?.relations) ? diagram.relations : [];

export const findRelationById = (diagram, relationId) =>
    getRelations(diagram).find((relation) => relation.idMx === relationId) ??
    null;

export const findRelationIndexById = (diagram, relationId) =>
    getRelations(diagram).findIndex((relation) => relation.idMx === relationId);

export const isIdentifyingRelation = (relation) =>
    relation?.isIdentifying === true;

export const canRelationHoldAttributes = (relation) =>
    relation?.canHoldAttributes === true;

export const relationHasBothEntitySides = (relation) =>
    !!relation?.side1?.entity?.idMx && !!relation?.side2?.entity?.idMx;

export const isRelationConfigured = (relation) =>
    relationHasBothEntitySides(relation) &&
    relation?.side1?.idMx !== "" &&
    relation?.side2?.idMx !== "";

export const isSelfRelation = (relation) =>
    relationHasBothEntitySides(relation) &&
    relation.side1.entity.idMx === relation.side2.entity.idMx;

export const relationInvolvesEntity = (relation, entityId) =>
    !!entityId &&
    (relation?.side1?.entity?.idMx === entityId ||
        relation?.side2?.entity?.idMx === entityId);

export const isManyToManyRelation = (relation) =>
    relation?.side1?.cardinality?.endsWith(":N") === true &&
    relation?.side2?.cardinality?.endsWith(":N") === true;

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

    const side1Maximum = relationData.side1?.cardinality?.split(":")?.[1];
    const side2Maximum = relationData.side2?.cardinality?.split(":")?.[1];

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
