import { normalizeIdentifier } from "../domain/relational/naming";

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
        const side1 = relation.side1;
        const side2 = relation.side2;
        const cardinalityType = getCardinalityType(
            side1.cardinality.split(":")[1],
            side2.cardinality.split(":")[1],
        );

        const table = {
            name: relation.name,
            type: cardinalityType,
            side1: {
                entity: entities.find((e) => e.idMx === side1.entity.idMx),
                cardinality: {
                    minimum: side1.cardinality.split(":")[0],
                    maximum: side1.cardinality.split(":")[1],
                },
            },
            side2: {
                entity: entities.find((e) => e.idMx === side2.entity.idMx),
                cardinality: {
                    minimum: side2.cardinality.split(":")[0],
                    maximum: side2.cardinality.split(":")[1],
                },
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

function getEntityPrimaryKeyColumns(
    entity,
    graph,
    visitedEntityIds = new Set(),
) {
    if (!entity) {
        return [];
    }

    if (!entity?.weak) {
        return entity.attributes
            .filter((attr) => attr.key)
            .map((attr) => ({
                name: attr.name,
                referencedColumn: attr.name,
            }));
    }

    if (visitedEntityIds.has(entity.idMx)) {
        throw new Error(
            `Cannot resolve primary key columns for weak entity "${entity.name}" because the identifying ownership chain contains a cycle.`,
        );
    }

    const nextVisitedEntityIds = new Set(visitedEntityIds);
    nextVisitedEntityIds.add(entity.idMx);

    const partialKeyColumns = entity.attributes
        .filter((attr) => attr.partialKey)
        .map((attr) => ({
            name: attr.name,
            referencedColumn: attr.name,
        }));

    const ownerEntity = graph.entities.find(
        (candidate) => candidate.idMx === entity.ownerEntityId,
    );

    const ownerKeyColumns = getEntityPrimaryKeyColumns(
        ownerEntity,
        graph,
        nextVisitedEntityIds,
    ).map((ownerKeyColumn) => {
        const weakTableColumnName = `${ownerKeyColumn.name}_${ownerEntity.name}`;

        return {
            name: weakTableColumnName,
            referencedColumn: weakTableColumnName,
        };
    });

    return [...partialKeyColumns, ...ownerKeyColumns];
}

function buildEntityTable(entity) {
    return {
        name: entity.name,
        attributes: entity.attributes.map((attr) => ({
            name: attr.name,
            key: attr.key ?? false,
            notnull: false,
            unique: false,
        })),
    };
}

function buildRelationForeignKeyAttributes({
    keyColumns,
    entity,
    relationName,
    suffix,
}) {
    const foreignKeyGroup = `${relationName}_${entity.idMx}_${suffix}`;

    const constraintName = `${keyColumns
        .map((keyColumn) => keyColumn.referencedColumn)
        .join("_")}_${relationName}_${suffix}`;

    return keyColumns.map((keyColumn) => ({
        name: `${keyColumn.name}_${relationName}_${suffix}`,
        key: true,
        foreign_key: entity.name,
        foreign_key_column: keyColumn.referencedColumn,
        foreign_key_group: foreignKeyGroup,
        foreign_key_constraint: constraintName,
    }));
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

    // Table for the entity with maximum 1
    const oneSideTable = {
        name: oneSide.entity.name,
        attributes: oneSide.entity.attributes.map((attr) => ({
            name: attr.name,
            key: attr.key,
            notnull: false,
            unique: false,
        })),
    };

    const oneSideKeyColumns = getEntityPrimaryKeyColumns(oneSide.entity, graph);

    // Table for the entity with maximum N
    const manySideTable = {
        name: manySide.entity.name,
        attributes: [
            ...manySide.entity.attributes.map((attr) => ({
                name: attr.name,
                key: attr.key,
                notnull: false, // Assuming the original notnull property for attributes
                unique: false,
            })),
            ...buildForeignKeyCopyAttributes({
                keyColumns: oneSideKeyColumns,
                referencedEntity: oneSide.entity,
                relationName: relation.name,
                suffix: side1.entity.idMx === side2.entity.idMx ? "ref" : "",
                notnull,
                unique: false,
            }),
        ],
    };

    // Relación reflexiva, se crea solo una tabla
    if (side1.entity.idMx === side2.entity.idMx) {
        return [manySideTable];
    }

    return [oneSideTable, manySideTable];
}

export function process11Relation(relation, graph) {
    const { side1, side2 } = relation;

    // Reflexive 1:1 relation: keep a single table and add a role-based copy
    // of the full PK as a self-referencing FK. The FK columns are UNIQUE
    // because the relationship has maximum 1 on both sides.
    if (side1.entity.idMx === side2.entity.idMx) {
        const notnull =
            side1.cardinality.minimum === "1" ||
            side2.cardinality.minimum === "1";

        const keyColumns = getEntityPrimaryKeyColumns(side1.entity, graph);

        const table = {
            name: side1.entity.name,
            attributes: [
                ...side1.entity.attributes.map((attr) => ({
                    name: attr.name,
                    key: attr.key,
                    notnull: false,
                    unique: false,
                })),
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
        // Extract attributes from both sides
        const side1Attributes = side1.entity.attributes.map((attr) => ({
            name: `${attr.name}_${relation.name}`,
            key: attr.key,
            notnull: false,
            unique: false,
        }));

        const side2Attributes = side2.entity.attributes.map((attr) => ({
            name: `${attr.name}_${relation.name}`,
            key: false,
            notnull: attr.key,
            unique: attr.key,
        }));

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

    const primaryKeyAttributes = primaryKeySide.entity.attributes.map(
        (attr) => ({
            name: attr.name,
            key: attr.key,
            notnull: false,
            unique: false,
        }),
    );

    const foreignKeyAttributes = foreignKeySide.entity.attributes.map(
        (attr) => ({
            name: attr.name,
            key: attr.key,
            notnull: false,
            unique: false,
        }),
    );

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
    if (side1.entity.idMx === side2.entity.idMx) {
        return [tableWithForeignKey];
    }

    return [tableWithoutForeignKey, tableWithForeignKey];
}

export function processNMRelation(relation, graph) {
    const { side1, side2, attributes } = relation;

    // Extract attributes from both sides
    const side1Entity = side1.entity;
    const side2Entity = side2.entity;

    const side1Attributes = side1Entity.attributes.map((attr) => ({
        name: attr.name,
        key: attr.key,
        notnull: false,
        unique: false,
    }));

    const side2Attributes = side2Entity.attributes.map((attr) => ({
        name: attr.name,
        key: attr.key,
        notnull: false,
        unique: false,
    }));

    // First table for side1 entity
    const firstTable = {
        name: side1Entity.name,
        attributes: side1Attributes,
    };

    // Second table for side2 entity
    const secondTable = {
        name: side2Entity.name,
        attributes: side2Attributes,
    };

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
        ...attributes.map((attr) => ({
            name: attr.name,
            key: false,
        })),
    ];

    const thirdTable = {
        name: relation.name,
        attributes: thirdTableAttributes,
    };

    // La relación es reflexiva y por tanto first y second table
    // son iguales y solo necesitamos una de las dos
    if (side1.entity.name === side2.entity.name) {
        return [firstTable, thirdTable];
    }

    return [firstTable, secondTable, thirdTable];
}

const getSQLType = (attribute) => {
    // Assuming all attributes are of type VARCHAR for simplicity
    return "VARCHAR(40)";
};

const createDropTablesSQL = (tables) => {
    const tableNames = [...new Set([...tables].map((table) => table.name))];

    if (tableNames.length === 0) {
        return "";
    }

    return `DROP TABLE IF EXISTS ${tableNames.join(", ")} CASCADE;`;
};

const createTableSQL = (table) => {
    const primaryKeyAttributes = table.attributes.filter((attr) => attr.key);
    const primaryKeyColumns = primaryKeyAttributes.map((attr) =>
        normalizeIdentifier(attr.name),
    );

    const uniqueGroups = new Map();

    for (const attr of table.attributes) {
        if (!attr.unique_group) continue;

        if (!uniqueGroups.has(attr.unique_group)) {
            uniqueGroups.set(attr.unique_group, []);
        }

        uniqueGroups.get(attr.unique_group).push(attr);
    }

    const columns = table.attributes
        .map((attr) => {
            let columnDef = `${normalizeIdentifier(attr.name)} ${getSQLType(
                attr,
            )}`;
            if (primaryKeyColumns.length === 1 && attr.key) {
                columnDef += " PRIMARY KEY";
            }

            if (attr.unique && !attr.unique_group) {
                columnDef += " UNIQUE";
            }

            if (attr.notnull && !attr.key) {
                columnDef += " NOT NULL";
            }
            return columnDef;
        })
        .join(",\n  ");

    const primaryKeyClause =
        primaryKeyColumns.length > 1
            ? `, \n  PRIMARY KEY (${primaryKeyColumns.join(", ")})`
            : "";

    const uniqueClauses = [...uniqueGroups.values()]
        .map((group) => {
            const firstAttribute = group[0];
            const constraintName = normalizeIdentifier(
                firstAttribute.unique_constraint ??
                    group.map((attr) => attr.name).join("_"),
            );

            const uniqueColumns = group
                .map((attr) => normalizeIdentifier(attr.name))
                .join(", ");

            return `, \n  CONSTRAINT UQ_${constraintName} UNIQUE (${uniqueColumns})`;
        })
        .join("");

    return `CREATE TABLE ${normalizeIdentifier(
        table.name,
    )} (\n  ${columns}${primaryKeyClause}${uniqueClauses}\n);`;
};

const createForeignKeySQL = (table) => {
    const foreignKeyAttributes = table.attributes.filter(
        (attr) => attr.foreign_key,
    );

    const foreignKeyGroups = new Map();

    for (const attr of foreignKeyAttributes) {
        const groupKey =
            attr.foreign_key_group ??
            `${table.name}_${attr.foreign_key}_${attr.name}`;

        if (!foreignKeyGroups.has(groupKey)) {
            foreignKeyGroups.set(groupKey, []);
        }

        foreignKeyGroups.get(groupKey).push(attr);
    }

    return [...foreignKeyGroups.values()]
        .map((group) => {
            const firstAttribute = group[0];

            const referencedTable = normalizeIdentifier(
                firstAttribute.foreign_key,
            );

            const sourceColumns = group
                .map((attr) => normalizeIdentifier(attr.name))
                .join(", ");

            const referencedColumns = group
                .map((attr) => normalizeIdentifier(attr.foreign_key_column))
                .join(", ");

            const constraintName = normalizeIdentifier(
                firstAttribute.foreign_key_constraint ??
                    group.map((attr) => attr.name).join("_"),
            );

            const onDeleteClause = firstAttribute.foreign_key_on_delete
                ? ` ON DELETE ${firstAttribute.foreign_key_on_delete}`
                : "";

            const onUpdateClause = firstAttribute.foreign_key_on_update
                ? ` ON UPDATE ${firstAttribute.foreign_key_on_update}`
                : "";

            return `ALTER TABLE ${normalizeIdentifier(
                table.name,
            )} ADD CONSTRAINT FK_${constraintName} FOREIGN KEY (${sourceColumns}) REFERENCES ${referencedTable}(${referencedColumns})${onDeleteClause}${onUpdateClause};`;
        })
        .join("\n");
};

export function generate1NSQL(tables) {
    const sql = tables.map(createTableSQL).join("\n\n");
    return sql;
}

export function generate11SQL(tables) {
    const sql = tables.map(createTableSQL).join("\n\n");
    return sql;
}

export function generateNMSQL(tables) {
    const sql = tables.map(createTableSQL).join("\n\n");
    return sql;
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
        weakTable.attributes = weakTable.attributes.map((attr) => {
            const sourceAttribute = entity.attributes.find(
                (candidate) => candidate.name === attr.name,
            );

            if (!sourceAttribute) {
                return attr;
            }

            return {
                ...attr,
                key: sourceAttribute.partialKey === true,
                notnull:
                    sourceAttribute.partialKey === true
                        ? true
                        : attr.notnull ?? false,
            };
        });

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

// Generate SQL
export function generateSQL(graph) {
    const tables = filterTables(graph);
    const tableMap = new Map(); // Track processed tables and their attributes

    applyWeakEntitySemantics(tableMap, graph);

    for (const table of tables) {
        let processedTablesArray;
        switch (table.type) {
            case "1:1":
                processedTablesArray = process11Relation(table, graph);
                break;
            case "1:N":
                processedTablesArray = process1NRelation(table, graph);
                break;
            case "N:M":
                processedTablesArray = processNMRelation(table, graph);
                break;
            default:
                processedTablesArray = [table];
                break;
        }

        // Add the processed tables to the map, merging attributes if needed
        for (const processedTable of processedTablesArray) {
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
            } else {
                tableMap.set(processedTable.name, processedTable);
            }
        }
    }

    for (const table of tableMap.values()) {
        table.name = normalizeIdentifier(table.name);

        const attributeNames = new Set();
        table.attributes.forEach((attr) => {
            let baseName = normalizeIdentifier(attr.name);
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
        });
    }

    const finalTables = [...tableMap.values()];

    const dropTablesScript = createDropTablesSQL(finalTables);

    const sqlScript = finalTables.map(createTableSQL).join("\n\n");

    const foreignKeyScript = finalTables
        .map(createForeignKeySQL)
        .filter(Boolean)
        .join("\n");

    return [dropTablesScript, sqlScript, foreignKeyScript]
        .filter(Boolean)
        .join("\n\n");
}
