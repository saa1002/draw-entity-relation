import {
    projectAttributeTreeToColumns,
    projectMultivaluedAttributeToColumns,
} from "../../../relational/attributeProjection";
import { getEntityPrimaryKeyColumnNamesIgnoringCycles } from "../../../relational/entityKeyColumns";
import { normalizeIdentifier } from "../../../relational/naming";
import { isMultivaluedAttribute } from "../../attributes";
import {
    canRelationHoldAttributes,
    findMandatoryOneToOneMergeRelationForEntity,
} from "../../relations";

// SQL identifier validation detects collisions that would appear only after
// normalizing names for SQL output.

// Multivalued auxiliary tables reuse owner key columns. Mandatory 1:1 merge
// relations rename those copied columns, so validation mirrors that strategy.
function getMultivaluedAuxiliaryOwnerColumnNames(entity, graph) {
    const ownerColumnNames = getEntityPrimaryKeyColumnNamesIgnoringCycles(
        entity,
        graph,
    );
    const mergeRelation = findMandatoryOneToOneMergeRelationForEntity(
        graph,
        entity,
    );

    if (!mergeRelation) {
        return ownerColumnNames;
    }

    return ownerColumnNames.map(
        (columnName) => `${columnName}_${mergeRelation.name}`,
    );
}

// Two different user-facing names may become the same SQL identifier after
// accent removal, whitespace replacement or lower-level normalization.
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

    // Entities and relations share the SQL table namespace.
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

    // Composite attributes are validated after projection to relational columns,
    // because only leaf attributes become SQL columns.
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
            canRelationHoldAttributes(relation) &&
            hasNormalizedAttributeCollision(relation.attributes || [])
        ) {
            return true;
        }
    }

    return false;
}
