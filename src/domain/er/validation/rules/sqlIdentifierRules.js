import {
    projectAttributeTreeToColumns,
    projectMultivaluedAttributeToColumns,
} from "../../../relational/attributeProjection";
import { normalizeIdentifier } from "../../../relational/naming";
import { isMultivaluedAttribute } from "../../attributes";
import { isMandatoryOneToOneMergeRelation } from "../../relations";

function findMandatoryOneToOneMergeRelationForEntity(entity, graph) {
    return graph.relations.find(
        (relation) =>
            isMandatoryOneToOneMergeRelation(relation) &&
            (relation.side1.entity.idMx === entity.idMx ||
                relation.side2.entity.idMx === entity.idMx),
    );
}

function getEntityPrimaryKeyColumnNames(
    entity,
    graph,
    visitedEntityIds = new Set(),
) {
    if (!entity) {
        return [];
    }

    if (!entity.weak) {
        return projectAttributeTreeToColumns(entity.attributes ?? [])
            .filter((attribute) => attribute.key)
            .map((attribute) => attribute.name);
    }

    if (visitedEntityIds.has(entity.idMx)) {
        return [];
    }

    const nextVisitedEntityIds = new Set(visitedEntityIds);
    nextVisitedEntityIds.add(entity.idMx);

    const partialKeyColumns = projectAttributeTreeToColumns(
        entity.attributes ?? [],
    )
        .filter((attribute) => attribute.partialKey)
        .map((attribute) => attribute.name);

    const ownerEntity = graph.entities.find(
        (candidate) => candidate.idMx === entity.ownerEntityId,
    );

    const ownerKeyColumns = getEntityPrimaryKeyColumnNames(
        ownerEntity,
        graph,
        nextVisitedEntityIds,
    ).map((ownerKeyColumn) => `${ownerKeyColumn}_${ownerEntity.name}`);

    return [...partialKeyColumns, ...ownerKeyColumns];
}

function getMultivaluedAuxiliaryOwnerColumnNames(entity, graph) {
    const ownerColumnNames = getEntityPrimaryKeyColumnNames(entity, graph);
    const mergeRelation = findMandatoryOneToOneMergeRelationForEntity(
        entity,
        graph,
    );

    if (!mergeRelation) {
        return ownerColumnNames;
    }

    return ownerColumnNames.map(
        (columnName) => `${columnName}_${mergeRelation.name}`,
    );
}

function hasNormalizedNameCollision(names) {
    const normalizedNames = new Set();

    for (const name of names) {
        const normalized = normalizeIdentifier(name);

        if (normalizedNames.has(normalized)) {
            return true;
        }

        normalizedNames.add(normalized);
    }

    return false;
}

function hasMultivaluedAuxiliaryTableColumnCollision(entity, graph) {
    const ownerColumnNames = getMultivaluedAuxiliaryOwnerColumnNames(
        entity,
        graph,
    );

    for (const attribute of entity.attributes ?? []) {
        if (!isMultivaluedAttribute(attribute)) {
            continue;
        }

        const valueColumnNames = projectMultivaluedAttributeToColumns(
            attribute,
        ).map((column) => column.name);

        if (
            hasNormalizedNameCollision([
                ...ownerColumnNames,
                ...valueColumnNames,
            ])
        ) {
            return true;
        }
    }

    return false;
}

export function sqlIdentifierCollisions(graph) {
    const normalizedNames = new Set();

    // Entidades y relaciones comparten namespace de tablas
    for (const entity of graph.entities) {
        const normalized = normalizeIdentifier(entity.name);

        if (normalizedNames.has(normalized)) {
            return true;
        }

        normalizedNames.add(normalized);
    }

    for (const relation of graph.relations) {
        const normalized = normalizeIdentifier(relation.name);

        if (normalizedNames.has(normalized)) {
            return true;
        }

        normalizedNames.add(normalized);
    }

    for (const entity of graph.entities) {
        for (const attribute of entity.attributes ?? []) {
            if (!isMultivaluedAttribute(attribute)) {
                continue;
            }

            const normalized = normalizeIdentifier(
                `${entity.name}_${attribute.name}`,
            );

            if (normalizedNames.has(normalized)) {
                return true;
            }

            normalizedNames.add(normalized);
        }
    }

    const hasNormalizedAttributeCollision = (attributes) => {
        const normalizedAttrNames = new Set();

        for (const attribute of projectAttributeTreeToColumns(attributes)) {
            const normalized = normalizeIdentifier(attribute.name);

            if (normalizedAttrNames.has(normalized)) {
                return true;
            }

            normalizedAttrNames.add(normalized);
        }

        return false;
    };

    for (const entity of graph.entities) {
        if (hasNormalizedAttributeCollision(entity.attributes || [])) {
            return true;
        }
    }

    for (const entity of graph.entities) {
        if (hasMultivaluedAuxiliaryTableColumnCollision(entity, graph)) {
            return true;
        }
    }

    for (const relation of graph.relations) {
        if (
            relation.canHoldAttributes &&
            hasNormalizedAttributeCollision(relation.attributes || [])
        ) {
            return true;
        }
    }

    return false;
}
