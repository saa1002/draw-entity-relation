import { isMultivaluedAttribute } from "../er/attributes";
import {
    findMandatoryOneToOneMergeRelationForEntity,
    getRelationSideCardinality,
    getRelationSideKeys,
    isSelfRelation,
    isTernaryRelation,
} from "../er/relations";
import {
    projectAttributeTreeToColumns,
    projectMultivaluedAttributeToColumns,
} from "./attributeProjection";
import { getEntityPrimaryKeyColumnReferences } from "./entityKeyColumns";
import { normalizeIdentifier } from "./naming";

// This function takes the graph and prepares the relations
// for the extractTables function
export function filterTables(graph) {
    const entities = [...graph.entities]; // Clone entities to avoid mutating the original graph
    const usedEntities = new Set(); // Track used entities
    const tables = [];

    function getCardinalityType(max1, max2) {
        const combinedCardinality = `${max1}:${max2}`;
        const reversedCombinedCardinality = `${max2}:${max1}`;

        let type;

        if (combinedCardinality === "1:1") {
            type = "1:1";
        } else if (
            combinedCardinality === "1:N" ||
            reversedCombinedCardinality === "1:N"
        ) {
            type = "1:N";
        } else if (combinedCardinality === "N:N") {
            type = "N:M";
        } else {
            type = "Unknown"; // This should never happen if data is correct
        }

        return type;
    }

    function processRelation(relation) {
        if (isTernaryRelation(relation)) {
            const table = {
                name: relation.name,
                type: "TERNARY",
                attributes: [...relation.attributes],
            };

            getRelationSideKeys(relation).forEach((sideKey) => {
                const side = relation[sideKey];
                table[sideKey] = {
                    entity: entities.find((e) => e.idMx === side.entity.idMx),
                    cardinality: getRelationSideCardinality(side),
                };
                usedEntities.add(side.entity.idMx);
            });

            return table;
        }

        const side1 = relation.side1;
        const side2 = relation.side2;
        const side1Cardinality = getRelationSideCardinality(side1);
        const side2Cardinality = getRelationSideCardinality(side2);

        const cardinalityType = getCardinalityType(
            side1Cardinality.maximum,
            side2Cardinality.maximum,
        );

        const table = {
            name: relation.name,
            type: cardinalityType,
            side1: {
                entity: entities.find((e) => e.idMx === side1.entity.idMx),
                cardinality: side1Cardinality,
            },
            side2: {
                entity: entities.find((e) => e.idMx === side2.entity.idMx),
                cardinality: side2Cardinality,
            },
            attributes: [...relation.attributes],
        };

        // Mark entities as used
        usedEntities.add(side1.entity.idMx);
        usedEntities.add(side2.entity.idMx);

        return table;
    }

    // Process relations first
    for (const relation of graph.relations) {
        if (relation.isIdentifying) {
            continue;
        }

        tables.push(processRelation(relation));
    }

    // Add remaining entities as tables
    for (const entity of entities) {
        if (!usedEntities.has(entity.idMx)) {
            tables.push(entity);
        }
    }

    return tables;
}

const getEntityPrimaryKeyColumns = getEntityPrimaryKeyColumnReferences;

function buildEntityAttributes(entity) {
    return projectAttributeTreeToColumns(entity.attributes).map((attr) => ({
        name: attr.name,
        key: attr.key ?? false,
        partialKey: attr.partialKey ?? false,
        notnull: false,
        unique: false,
    }));
}

function buildEntityTable(entity) {
    return {
        name: entity.name,
        attributes: buildEntityAttributes(entity),
    };
}

function getMultivaluedEntityAttributes(entity) {
    return (entity.attributes ?? []).filter(isMultivaluedAttribute);
}

function buildMultivaluedValueAttributes(attribute) {
    return projectMultivaluedAttributeToColumns(attribute).map((column) => ({
        name: column.name,
        key: true,
        partialKey: false,
        notnull: true,
        unique: false,
    }));
}

function getMultivaluedAttributeOwnerReference(entity, graph, tableMap) {
    if (tableMap.has(entity.name)) {
        return {
            tableName: entity.name,
            keyColumns: getEntityPrimaryKeyColumns(entity, graph),
        };
    }

    const mergeRelation = findMandatoryOneToOneMergeRelationForEntity(
        graph,
        entity,
    );

    if (mergeRelation && tableMap.has(mergeRelation.name)) {
        return {
            tableName: mergeRelation.name,
            keyColumns: getEntityPrimaryKeyColumns(entity, graph).map(
                (keyColumn) => ({
                    name: `${keyColumn.name}_${mergeRelation.name}`,
                    referencedColumn: `${keyColumn.referencedColumn}_${mergeRelation.name}`,
                }),
            ),
        };
    }

    return {
        tableName: entity.name,
        keyColumns: getEntityPrimaryKeyColumns(entity, graph),
    };
}

function buildMultivaluedAttributeTables(entity, graph, tableMap) {
    const ownerReference = getMultivaluedAttributeOwnerReference(
        entity,
        graph,
        tableMap,
    );

    return getMultivaluedEntityAttributes(entity).map((attribute) => {
        const tableName = `${entity.name}_${attribute.name}`;
        const foreignKeyGroup = `${entity.idMx}_${attribute.idMx}_multivalued`;
        const foreignKeyConstraint = `${tableName}_${ownerReference.tableName}_owner`;

        const ownerKeyAttributes = ownerReference.keyColumns.map(
            (keyColumn) => ({
                name: keyColumn.name,
                key: true,
                notnull: true,
                unique: false,
                foreign_key: ownerReference.tableName,
                foreign_key_column: keyColumn.referencedColumn,
                foreign_key_group: foreignKeyGroup,
                foreign_key_constraint: foreignKeyConstraint,
                foreign_key_on_delete: "CASCADE",
                foreign_key_on_update: "CASCADE",
            }),
        );

        return {
            name: tableName,
            attributes: [
                ...ownerKeyAttributes,
                ...buildMultivaluedValueAttributes(attribute),
            ],
        };
    });
}

function buildRelationAttributes(attributes) {
    return projectAttributeTreeToColumns(attributes).map((attr) => ({
        name: attr.name,
        key: false,
    }));
}

function buildRelationForeignKeyAttributes({
    keyColumns,
    entity,
    relationName,
    suffix,
    key = true,
    notnull = false,
}) {
    const foreignKeyGroup = `${relationName}_${entity.idMx}_${suffix}`;

    const constraintName = `${keyColumns
        .map((keyColumn) => keyColumn.referencedColumn)
        .join("_")}_${relationName}_${suffix}`;

    return keyColumns.map((keyColumn) => {
        const attribute = {
            name: `${keyColumn.name}_${relationName}_${suffix}`,
            key,
            foreign_key: entity.name,
            foreign_key_column: keyColumn.referencedColumn,
            foreign_key_group: foreignKeyGroup,
            foreign_key_constraint: constraintName,
        };

        if (notnull) {
            attribute.notnull = true;
        }

        return attribute;
    });
}

function buildForeignKeyCopyAttributes({
    keyColumns,
    referencedEntity,
    relationName,
    suffix,
    notnull = false,
    unique = false,
}) {
    const suffixPart = suffix ? `_${suffix}` : "";
    const foreignKeyGroup = `${relationName}_${referencedEntity.idMx}${suffixPart}`;

    const constraintName = `${keyColumns
        .map((keyColumn) => keyColumn.referencedColumn)
        .join("_")}_${relationName}${suffixPart}`;

    const shouldUseCompositeUnique = unique && keyColumns.length > 1;

    return keyColumns.map((keyColumn) => ({
        name: `${keyColumn.name}_${relationName}${suffixPart}`,
        key: false,
        notnull,
        unique,
        unique_group: shouldUseCompositeUnique ? foreignKeyGroup : undefined,
        unique_constraint: shouldUseCompositeUnique
            ? constraintName
            : undefined,
        foreign_key: referencedEntity.name,
        foreign_key_column: keyColumn.referencedColumn,
        foreign_key_group: foreignKeyGroup,
        foreign_key_constraint: constraintName,
    }));
}

export function process1NRelation(relation, graph) {
    const { side1, side2 } = relation;

    let oneSide;
    let manySide;

    // Determine which side is 1 and which is N
    if (side1.cardinality.maximum === "1") {
        oneSide = side1;
        manySide = side2;
    } else {
        oneSide = side2;
        manySide = side1;
    }

    // Determine the notnull property
    const notnull = oneSide.cardinality.minimum === "1";

    const oneSideTable = buildEntityTable(oneSide.entity);

    const oneSideKeyColumns = getEntityPrimaryKeyColumns(oneSide.entity, graph);

    const manySideTable = {
        name: manySide.entity.name,
        attributes: [
            ...buildEntityAttributes(manySide.entity),
            ...buildForeignKeyCopyAttributes({
                keyColumns: oneSideKeyColumns,
                referencedEntity: oneSide.entity,
                relationName: relation.name,
                suffix: isSelfRelation(relation) ? "ref" : "",
                notnull,
                unique: false,
            }),
        ],
    };

    // Relación reflexiva, se crea solo una tabla
    if (isSelfRelation(relation)) {
        return [manySideTable];
    }

    return [oneSideTable, manySideTable];
}

export function process11Relation(relation, graph) {
    const { side1, side2 } = relation;

    // Reflexive 1:1 relation: keep a single table and add a role-based copy
    // of the full PK as a self-referencing FK. The FK columns are UNIQUE
    // because the relationship has maximum 1 on both sides.
    if (isSelfRelation(relation)) {
        const notnull =
            side1.cardinality.minimum === "1" ||
            side2.cardinality.minimum === "1";

        const keyColumns = getEntityPrimaryKeyColumns(side1.entity, graph);

        const table = {
            name: side1.entity.name,
            attributes: [
                ...buildEntityAttributes(side1.entity),
                ...buildForeignKeyCopyAttributes({
                    keyColumns,
                    referencedEntity: side1.entity,
                    relationName: relation.name,
                    suffix: "ref",
                    notnull,
                    unique: true,
                }),
            ],
        };

        return [table];
    }

    if (
        side1.cardinality.minimum === "1" &&
        side2.cardinality.minimum === "1" &&
        side1.cardinality.maximum === "1" &&
        side2.cardinality.maximum === "1"
    ) {
        const side1Attributes = buildEntityAttributes(side1.entity).map(
            (attr) => ({
                ...attr,
                name: `${attr.name}_${relation.name}`,
            }),
        );

        const side2Attributes = buildEntityAttributes(side2.entity).map(
            (attr) => ({
                name: `${attr.name}_${relation.name}`,
                key: false,
                notnull: attr.key,
                unique: attr.key,
            }),
        );

        // Merge attributes, ensuring PKs are correctly set
        const mergedAttributes = [...side1Attributes, ...side2Attributes];

        // Create the resulting table
        const resultTable = {
            name: `${relation.name}`,
            attributes: mergedAttributes,
        };

        return [resultTable];
    }

    // Case where one side has (0,1) cardinality or both sides have equal minimum cardinality
    let tableWithForeignKey;
    let tableWithoutForeignKey;
    let foreignKeySide;
    let primaryKeySide;
    let notnull = false;

    if (
        side1.cardinality.minimum === "0" &&
        side2.cardinality.minimum === "0"
    ) {
        // Both sides have the same minimum cardinality
        foreignKeySide = side1;
        primaryKeySide = side2;
    } else {
        notnull = true;
        // Use ternary operators to determine foreignKeySide and primaryKeySide
        foreignKeySide = side1.cardinality.minimum === "0" ? side1 : side2;
        primaryKeySide = side1.cardinality.minimum === "0" ? side2 : side1;
    }

    const primaryKeyAttributes = buildEntityAttributes(primaryKeySide.entity);

    const foreignKeyAttributes = buildEntityAttributes(foreignKeySide.entity);

    const primaryKeyColumns = getEntityPrimaryKeyColumns(
        primaryKeySide.entity,
        graph,
    );

    foreignKeyAttributes.push(
        ...buildForeignKeyCopyAttributes({
            keyColumns: primaryKeyColumns,
            referencedEntity: primaryKeySide.entity,
            relationName: relation.name,
            suffix: "",
            notnull,
            unique: true,
        }),
    );

    tableWithForeignKey = {
        name: `${foreignKeySide.entity.name}`,
        attributes: foreignKeyAttributes,
    };

    tableWithoutForeignKey = {
        name: `${primaryKeySide.entity.name}`,
        attributes: primaryKeyAttributes,
    };

    // Si la relación es reflexiva solo se devuelve esta tabla
    if (isSelfRelation(relation)) {
        return [tableWithForeignKey];
    }

    return [tableWithoutForeignKey, tableWithForeignKey];
}

export function processNMRelation(relation, graph) {
    const { side1, side2, attributes } = relation;

    // Extract attributes from both sides
    const side1Entity = side1.entity;
    const side2Entity = side2.entity;

    const firstTable = buildEntityTable(side1Entity);

    const secondTable = buildEntityTable(side2Entity);

    const side1KeyColumns = getEntityPrimaryKeyColumns(side1Entity, graph);
    const side2KeyColumns = getEntityPrimaryKeyColumns(side2Entity, graph);

    if (side1KeyColumns.length === 0 || side2KeyColumns.length === 0) {
        throw new Error(
            `Cannot process N:M relation "${relation.name}" because one side has no key columns.`,
        );
    }

    const thirdTableAttributes = [
        ...buildRelationForeignKeyAttributes({
            keyColumns: side1KeyColumns,
            entity: side1Entity,
            relationName: relation.name,
            suffix: "1",
        }),
        ...buildRelationForeignKeyAttributes({
            keyColumns: side2KeyColumns,
            entity: side2Entity,
            relationName: relation.name,
            suffix: "2",
        }),
        ...buildRelationAttributes(attributes),
    ];

    const thirdTable = {
        name: relation.name,
        attributes: thirdTableAttributes,
    };

    // La relación es reflexiva y por tanto first y second table
    // son iguales y solo necesitamos una de las dos
    if (isSelfRelation(relation)) {
        return [firstTable, thirdTable];
    }

    return [firstTable, secondTable, thirdTable];
}

function getTernaryCandidateKeySideIndexes(sides) {
    const oneSideIndexes = sides
        .map((side, index) => ({ side, index }))
        .filter(({ side }) => side.cardinality.maximum === "1")
        .map(({ index }) => index);

    if (oneSideIndexes.length === 0) {
        return [sides.map((_, index) => index)];
    }

    return oneSideIndexes.map((oneSideIndex) =>
        sides
            .map((_, index) => index)
            .filter((index) => index !== oneSideIndex),
    );
}

export function processTernaryRelation(relation, graph) {
    const sides = [relation.side1, relation.side2, relation.side3];
    const candidateKeySideIndexes = getTernaryCandidateKeySideIndexes(sides);
    const primaryKeySideIndexes = new Set(candidateKeySideIndexes.at(0));
    const uniqueCandidateKeySideIndexes = candidateKeySideIndexes.slice(1);

    const entityTables = sides.map((side) => buildEntityTable(side.entity));
    const relationTableAttributes = [];
    const attributesBySideIndex = [];

    sides.forEach((side, index) => {
        const entityKeyColumns = getEntityPrimaryKeyColumns(side.entity, graph);

        if (entityKeyColumns.length === 0) {
            throw new Error(
                `No se puede procesar la relación ternaria "${relation.name}" porque un lado no tiene columnas de clave.`,
            );
        }

        const sideAttributes = buildRelationForeignKeyAttributes({
            keyColumns: entityKeyColumns,
            entity: side.entity,
            relationName: relation.name,
            suffix: String(index + 1),
            key: primaryKeySideIndexes.has(index),
            notnull: !primaryKeySideIndexes.has(index),
        });

        attributesBySideIndex[index] = sideAttributes;
        relationTableAttributes.push(...sideAttributes);
    });

    const uniqueConstraints = uniqueCandidateKeySideIndexes.map(
        (candidateKeyIndexes, index) => ({
            name: `${relation.name}_candidate_${index + 2}`,
            columns: candidateKeyIndexes.flatMap((sideIndex) =>
                attributesBySideIndex[sideIndex].map(
                    (attribute) => attribute.name,
                ),
            ),
        }),
    );

    const relationTable = {
        name: relation.name,
        attributes: [
            ...relationTableAttributes,
            ...buildRelationAttributes(relation.attributes),
        ],
    };

    if (uniqueConstraints.length > 0) {
        relationTable.uniqueConstraints = uniqueConstraints;
    }

    return [...entityTables, relationTable];
}

function applyWeakEntitySemantics(tableMap, graph) {
    for (const entity of graph.entities) {
        if (!entity.weak) continue;

        const ownerEntity = graph.entities.find(
            (candidate) => candidate.idMx === entity.ownerEntityId,
        );

        if (!ownerEntity) continue;

        let weakTable = tableMap.get(entity.name);

        if (!weakTable) {
            weakTable = buildEntityTable(entity);
            tableMap.set(entity.name, weakTable);
        }

        // In weak entities, the partial key is marked as part of the primary key.
        // The owner primary key columns are added afterwards to complete the
        // composite primary key of the weak entity.
        weakTable.attributes = weakTable.attributes.map((attr) => ({
            ...attr,
            key: attr.partialKey === true,
            notnull: attr.partialKey === true ? true : attr.notnull ?? false,
        }));

        const ownerPrimaryKeys = getEntityPrimaryKeyColumns(ownerEntity, graph);
        const foreignKeyGroup = `${entity.idMx}_${ownerEntity.idMx}_identifying_owner`;
        const foreignKeyConstraint = `${entity.name}_${ownerEntity.name}_identifying_owner`;

        for (const ownerPrimaryKey of ownerPrimaryKeys) {
            const foreignKeyName = `${ownerPrimaryKey.name}_${ownerEntity.name}`;

            const alreadyExists = weakTable.attributes.some(
                (attr) => attr.name === foreignKeyName,
            );

            if (alreadyExists) continue;

            weakTable.attributes.push({
                name: foreignKeyName,
                key: true,
                notnull: true,
                unique: false,
                foreign_key: ownerEntity.name,
                foreign_key_column: ownerPrimaryKey.referencedColumn,
                foreign_key_group: foreignKeyGroup,
                foreign_key_constraint: foreignKeyConstraint,
                foreign_key_on_delete: "CASCADE",
                foreign_key_on_update: "CASCADE",
            });
        }
    }
}

function mergeProcessedTable(tableMap, processedTable) {
    if (tableMap.has(processedTable.name)) {
        const existingTable = tableMap.get(processedTable.name);
        const existingAttributes = new Set(
            existingTable.attributes.map((attr) => attr.name),
        );

        processedTable.attributes.forEach((attr) => {
            if (!existingAttributes.has(attr.name)) {
                existingTable.attributes.push(attr);
            }
        });

        return;
    }

    tableMap.set(processedTable.name, processedTable);
}

function processRelationalTable(table, graph) {
    switch (table.type) {
        case "1:1":
            return process11Relation(table, graph);
        case "1:N":
            return process1NRelation(table, graph);
        case "N:M":
            return processNMRelation(table, graph);
        case "TERNARY":
            return processTernaryRelation(table, graph);
        default:
            return table.type ? [table] : [buildEntityTable(table)];
    }
}

function buildRelationalTables(graph) {
    const tables = filterTables(graph);
    const tableMap = new Map(); // Track processed tables and their attributes

    applyWeakEntitySemantics(tableMap, graph);

    for (const table of tables) {
        const processedTables = processRelationalTable(table, graph);

        for (const processedTable of processedTables) {
            mergeProcessedTable(tableMap, processedTable);
        }
    }

    const multivaluedAttributeTables = graph.entities.flatMap((entity) =>
        buildMultivaluedAttributeTables(entity, graph, tableMap),
    );

    return [...tableMap.values(), ...multivaluedAttributeTables];
}

function normalizeRelationalTableIdentifiers(tables) {
    for (const table of tables) {
        table.name = normalizeIdentifier(table.name);

        const attributeNames = new Set();
        const attributeNameMap = new Map();

        table.attributes.forEach((attr) => {
            const originalName = attr.name;
            const baseName = normalizeIdentifier(attr.name);
            let uniqueName = baseName;

            if (attributeNames.has(uniqueName)) {
                let counter = 1;
                uniqueName = `${baseName}_${counter}`;

                while (attributeNames.has(uniqueName)) {
                    counter++;
                    uniqueName = `${baseName}_${counter}`;
                }
            }

            attr.name = uniqueName;
            attributeNames.add(uniqueName);
            attributeNameMap.set(originalName, uniqueName);
        });

        if (Array.isArray(table.uniqueConstraints)) {
            table.uniqueConstraints = table.uniqueConstraints.map(
                (constraint) => ({
                    ...constraint,
                    name: normalizeIdentifier(constraint.name),
                    columns: constraint.columns.map(
                        (column) =>
                            attributeNameMap.get(column) ??
                            normalizeIdentifier(column),
                    ),
                }),
            );
        }
    }

    return tables;
}

export function mapErDiagramToRelationalModel(graph) {
    const relationalTables = buildRelationalTables(graph);
    const normalizedTables =
        normalizeRelationalTableIdentifiers(relationalTables);

    return {
        tables: normalizedTables,
    };
}
