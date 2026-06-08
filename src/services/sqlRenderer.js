import { normalizeIdentifier } from "../domain/relational/naming";

const getSQLType = (attribute) => {
    // Assuming all attributes are of type VARCHAR for simplicity
    return "VARCHAR(40)";
};

const getTableName = (table) => normalizeIdentifier(table.name);

const getForeignKeyGroups = (table) => {
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

    return [...foreignKeyGroups.entries()].map(([groupKey, group]) => {
        const firstAttribute = group[0];

        const referencedTable = normalizeIdentifier(firstAttribute.foreign_key);

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

        return {
            key: groupKey,
            tableName: getTableName(table),
            referencedTable,
            sourceColumns,
            referencedColumns,
            constraintName,
            onDeleteClause,
            onUpdateClause,
        };
    });
};

const createForeignKeyConstraintSQL = (foreignKeyGroup) =>
    `CONSTRAINT FK_${foreignKeyGroup.constraintName} FOREIGN KEY (${foreignKeyGroup.sourceColumns}) REFERENCES ${foreignKeyGroup.referencedTable}(${foreignKeyGroup.referencedColumns})${foreignKeyGroup.onDeleteClause}${foreignKeyGroup.onUpdateClause}`;

const createDeferredForeignKeySQL = (foreignKeyGroup) =>
    `ALTER TABLE ${
        foreignKeyGroup.tableName
    } ADD ${createForeignKeyConstraintSQL(foreignKeyGroup)};`;

const createDropTablesSQL = (tables) => {
    const tableNames = [...new Set([...tables].map(getTableName))];

    if (tableNames.length === 0) {
        return "";
    }

    return `DROP TABLE IF EXISTS ${tableNames.join(", ")} CASCADE;`;
};

const createTableSQL = (table, inlineForeignKeyGroups = []) => {
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

    const groupedUniqueClauses = [...uniqueGroups.values()]
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

    const explicitUniqueClauses = Array.isArray(table.uniqueConstraints)
        ? table.uniqueConstraints
              .map((constraint) => {
                  const constraintName = normalizeIdentifier(
                      constraint.name ?? constraint.columns.join("_"),
                  );

                  const uniqueColumns = constraint.columns
                      .map((column) => normalizeIdentifier(column))
                      .join(", ");

                  return `, \n  CONSTRAINT UQ_${constraintName} UNIQUE (${uniqueColumns})`;
              })
              .join("")
        : "";

    const foreignKeyClauses = inlineForeignKeyGroups
        .map(
            (foreignKeyGroup) =>
                `, \n  ${createForeignKeyConstraintSQL(foreignKeyGroup)}`,
        )
        .join("");

    return `CREATE TABLE ${getTableName(
        table,
    )} (\n  ${columns}${primaryKeyClause}${groupedUniqueClauses}${explicitUniqueClauses}${foreignKeyClauses}\n);`;
};

const getForeignKeyGroupId = (foreignKeyGroup) =>
    `${foreignKeyGroup.tableName}_${foreignKeyGroup.key}`;

const collectForeignKeyGroupsByTable = (tables) => {
    const foreignKeyGroupsByTable = new Map();

    for (const table of tables) {
        foreignKeyGroupsByTable.set(
            getTableName(table),
            getForeignKeyGroups(table),
        );
    }

    return foreignKeyGroupsByTable;
};

const getBlockingForeignKeyGroups = ({
    table,
    createdTableNames,
    tableNames,
    foreignKeyGroupsByTable,
    deferredForeignKeyGroupIds,
}) => {
    const tableName = getTableName(table);
    const foreignKeyGroups = foreignKeyGroupsByTable.get(tableName) ?? [];

    return foreignKeyGroups.filter((foreignKeyGroup) => {
        if (
            deferredForeignKeyGroupIds.has(
                getForeignKeyGroupId(foreignKeyGroup),
            )
        ) {
            return false;
        }

        if (foreignKeyGroup.referencedTable === tableName) {
            return false;
        }

        if (!tableNames.has(foreignKeyGroup.referencedTable)) {
            return false;
        }

        return !createdTableNames.has(foreignKeyGroup.referencedTable);
    });
};

const orderTablesAndForeignKeys = (tables) => {
    const remainingTables = [...tables];
    const orderedTables = [];
    const createdTableNames = new Set();
    const tableNames = new Set(tables.map(getTableName));
    const foreignKeyGroupsByTable = collectForeignKeyGroupsByTable(tables);
    const inlineForeignKeysByTable = new Map();
    const deferredForeignKeyGroups = [];
    const deferredForeignKeyGroupIds = new Set();

    while (remainingTables.length > 0) {
        let selectedTableIndex = remainingTables.findIndex(
            (table) =>
                getBlockingForeignKeyGroups({
                    table,
                    createdTableNames,
                    tableNames,
                    foreignKeyGroupsByTable,
                    deferredForeignKeyGroupIds,
                }).length === 0,
        );

        if (selectedTableIndex === -1) {
            selectedTableIndex = 0;

            const blockingForeignKeyGroups = getBlockingForeignKeyGroups({
                table: remainingTables[selectedTableIndex],
                createdTableNames,
                tableNames,
                foreignKeyGroupsByTable,
                deferredForeignKeyGroupIds,
            });

            for (const foreignKeyGroup of blockingForeignKeyGroups) {
                deferredForeignKeyGroupIds.add(
                    getForeignKeyGroupId(foreignKeyGroup),
                );
                deferredForeignKeyGroups.push(foreignKeyGroup);
            }
        }

        const [table] = remainingTables.splice(selectedTableIndex, 1);
        const tableName = getTableName(table);

        const inlineForeignKeyGroups = (
            foreignKeyGroupsByTable.get(tableName) ?? []
        ).filter(
            (foreignKeyGroup) =>
                !deferredForeignKeyGroupIds.has(
                    getForeignKeyGroupId(foreignKeyGroup),
                ),
        );

        inlineForeignKeysByTable.set(tableName, inlineForeignKeyGroups);
        orderedTables.push(table);
        createdTableNames.add(tableName);
    }

    return {
        orderedTables,
        inlineForeignKeysByTable,
        deferredForeignKeyGroups,
    };
};

function renderSqlScript(tables) {
    const {
        orderedTables,
        inlineForeignKeysByTable,
        deferredForeignKeyGroups,
    } = orderTablesAndForeignKeys(tables);

    const dropTablesScript = createDropTablesSQL(orderedTables);

    const createTablesScript = orderedTables
        .map((table) =>
            createTableSQL(
                table,
                inlineForeignKeysByTable.get(getTableName(table)) ?? [],
            ),
        )
        .join("\n\n");

    const foreignKeyScript = deferredForeignKeyGroups
        .map(createDeferredForeignKeySQL)
        .join("\n");

    return [dropTablesScript, createTablesScript, foreignKeyScript]
        .filter(Boolean)
        .join("\n\n");
}

export function renderRelationalModelToSQL(relationalModel) {
    return renderSqlScript(relationalModel.tables);
}
