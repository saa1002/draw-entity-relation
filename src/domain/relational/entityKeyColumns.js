import { findEntityById, isWeakEntity } from "../er/entities";
import {
    getIsaGeneralizationEntityId,
    getIsaSpecializationEntityIds,
} from "../er/isa";
import { projectAttributeTreeToColumns } from "./attributeProjection";

// Resolves the relational primary-key columns for an entity. Strong entities use
// their own primary-key attributes, weak entities combine partial keys with the
// owner key, and ISA specializations inherit the key from their generalization.

// Key resolution can be recursive for weak entities and ISA specializations.
// Cycle handling is configurable so validation can inspect invalid diagrams
// without crashing, while transformation can fail explicitly.
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

// Strong entities obtain their primary key directly from attributes marked as key
// in the E/R model.
const projectStrongEntityPrimaryKeyColumns = (entity) =>
    projectAttributeTreeToColumns(entity.attributes ?? [])
        .filter((attribute) => attribute.key)
        .map((attribute) => ({
            name: attribute.name,
            referencedColumn: attribute.name,
        }));

// Weak entities contribute their partial key to the final composite primary key.
const projectWeakEntityPartialKeyColumns = (entity) =>
    projectAttributeTreeToColumns(entity.attributes ?? [])
        .filter((attribute) => attribute.partialKey)
        .map((attribute) => ({
            name: attribute.name,
            referencedColumn: attribute.name,
        }));

// Owner key columns are renamed when copied into the weak-entity table to avoid
// collisions and to make the origin of inherited columns explicit.
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

// Main key-resolution entry point. The returned objects keep both the local
// column name and the referenced column name, which can differ after weak-entity
// ownership or ISA inheritance has been applied.
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
        // ISA specializations do not define an independent primary key in the current
        // strategy. Their key is resolved recursively from the generalization entity.
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

    // Weak-entity keys are built recursively because the owner can also be weak.
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
