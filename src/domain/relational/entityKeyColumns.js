import { findEntityById, isWeakEntity } from "../er/entities";
import {
    getIsaGeneralizationEntityId,
    getIsaSpecializationEntityIds,
} from "../er/isa";
import { projectAttributeTreeToColumns } from "./attributeProjection";

const PRIMARY_KEY_CYCLE_HANDLING = Object.freeze({
    RETURN_EMPTY: "return-empty",
    THROW: "throw",
});

const buildCycleError = (entity) =>
    new Error(
        `Cannot resolve primary key columns for weak entity "${entity.name}" because the identifying ownership chain contains a cycle.`,
    );

const getIsaGeneralizationForSpecialization = (graph, specializationId) => {
    const isa = graph?.isas?.find((candidate) =>
        getIsaSpecializationEntityIds(candidate).includes(specializationId),
    );

    if (!isa) {
        return null;
    }

    return findEntityById(graph, getIsaGeneralizationEntityId(isa));
};

const buildIsaCycleError = (entity) =>
    new Error(
        `Cannot resolve primary key columns for ISA specialization "${entity.name}" because the ISA hierarchy contains a cycle.`,
    );

const projectStrongEntityPrimaryKeyColumns = (entity) =>
    projectAttributeTreeToColumns(entity.attributes ?? [])
        .filter((attribute) => attribute.key)
        .map((attribute) => ({
            name: attribute.name,
            referencedColumn: attribute.name,
        }));

const projectWeakEntityPartialKeyColumns = (entity) =>
    projectAttributeTreeToColumns(entity.attributes ?? [])
        .filter((attribute) => attribute.partialKey)
        .map((attribute) => ({
            name: attribute.name,
            referencedColumn: attribute.name,
        }));

const prefixOwnerPrimaryKeyColumnsForWeakEntity = (
    ownerKeyColumns,
    ownerEntity,
) => {
    if (!ownerEntity) {
        return [];
    }

    return ownerKeyColumns.map((ownerKeyColumn) => {
        const weakTableColumnName = `${ownerKeyColumn.name}_${ownerEntity.name}`;

        return {
            name: weakTableColumnName,
            referencedColumn: weakTableColumnName,
        };
    });
};

export const getEntityPrimaryKeyColumnReferences = (
    entity,
    graph,
    options = {},
) => {
    if (!entity) {
        return [];
    }

    const visitedEntityIds = options.visitedEntityIds ?? new Set();
    const cycleHandling =
        options.cycleHandling ?? PRIMARY_KEY_CYCLE_HANDLING.THROW;

    if (!isWeakEntity(entity)) {
        const isaGeneralization = getIsaGeneralizationForSpecialization(
            graph,
            entity.idMx,
        );

        if (!isaGeneralization) {
            return projectStrongEntityPrimaryKeyColumns(entity);
        }

        if (visitedEntityIds.has(entity.idMx)) {
            if (cycleHandling === PRIMARY_KEY_CYCLE_HANDLING.RETURN_EMPTY) {
                return [];
            }

            throw buildIsaCycleError(entity);
        }

        const nextVisitedEntityIds = new Set(visitedEntityIds);
        nextVisitedEntityIds.add(entity.idMx);

        return getEntityPrimaryKeyColumnReferences(isaGeneralization, graph, {
            ...options,
            cycleHandling,
            visitedEntityIds: nextVisitedEntityIds,
        });
    }

    if (visitedEntityIds.has(entity.idMx)) {
        if (cycleHandling === PRIMARY_KEY_CYCLE_HANDLING.RETURN_EMPTY) {
            return [];
        }

        throw buildCycleError(entity);
    }

    const nextVisitedEntityIds = new Set(visitedEntityIds);
    nextVisitedEntityIds.add(entity.idMx);

    const ownerEntity = findEntityById(graph, entity.ownerEntityId);
    const ownerKeyColumns = getEntityPrimaryKeyColumnReferences(
        ownerEntity,
        graph,
        {
            cycleHandling,
            visitedEntityIds: nextVisitedEntityIds,
        },
    );

    return [
        ...projectWeakEntityPartialKeyColumns(entity),
        ...prefixOwnerPrimaryKeyColumnsForWeakEntity(
            ownerKeyColumns,
            ownerEntity,
        ),
    ];
};

export const getEntityPrimaryKeyColumnNames = (entity, graph, options = {}) =>
    getEntityPrimaryKeyColumnReferences(entity, graph, options).map(
        (column) => column.name,
    );

export const getEntityPrimaryKeyColumnNamesIgnoringCycles = (entity, graph) =>
    getEntityPrimaryKeyColumnNames(entity, graph, {
        cycleHandling: PRIMARY_KEY_CYCLE_HANDLING.RETURN_EMPTY,
    });
