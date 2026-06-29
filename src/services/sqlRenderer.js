import { normalizeIdentifier } from "../domain/relational/naming";

// Renders the intermediate relational model as simplified PostgreSQL-compatible
// SQL. The E/R transformation is already done; this module focuses on identifier
// normalization, constraints, table ordering and deferred foreign keys.

// The current SQL generator uses a single simplified type for all attributes.
const getSQLType = () => "VARCHAR(40)";

const getTableName = (table) => normalizeIdentifier(table.name);

const getTablePrimaryKeyColumns = (table) =>
    table.attributes
        .filter((attr) => attr.key)
        .map((attr) => normalizeIdentifier(attr.name));

const createPrimaryKeyColumnsByTable = (tables) =>
    new Map(
        tables.map((table) => [
            getTableName(table),
            getTablePrimaryKeyColumns(table),
        ]),
    );

const areSameColumnList = (firstColumns, secondColumns) =>
    firstColumns.length === secondColumns.length &&
    firstColumns.every((column, index) => column === secondColumns[index]);

// Groups foreign-key columns that belong to the same logical constraint. This is
// required for composite foreign keys, where several columns must be rendered as
// a single FOREIGN KEY clause.
const getForeignKeyGroups = (table, primaryKeyColumnsByTable) => {
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

        const sourceColumnNames = group.map((attr) =>
            normalizeIdentifier(attr.name),
        );

        const referencedColumnNames = group.map((attr) =>
            normalizeIdentifier(attr.foreign_key_column),
        );

        const sourceColumns = sourceColumnNames.join(", ");

        const referencedColumns = referencedColumnNames.join(", ");

        const referencedPrimaryKeyColumns =
            primaryKeyColumnsByTable.get(referencedTable) ?? [];

        // PostgreSQL allows omitting the referenced column list when the FK points to the
        // complete primary key. Otherwise the referenced columns are emitted explicitly.
        const referencesPrimaryKey =
            referencedPrimaryKeyColumns.length > 0 &&
            areSameColumnList(
                referencedColumnNames,
                referencedPrimaryKeyColumns,
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
            sourceColumnNames,
            referencedColumnNames,
            referencesPrimaryKey,
            onDeleteClause,
            onUpdateClause,
        };
    });
};

const getReferencedTableSQL = (foreignKeyGroup) =>
    foreignKeyGroup.referencesPrimaryKey
        ? foreignKeyGroup.referencedTable
        : `${foreignKeyGroup.referencedTable}(${foreignKeyGroup.referencedColumns})`;

const createReferencesSQL = (foreignKeyGroup) =>
    `REFERENCES ${getReferencedTableSQL(foreignKeyGroup)}${
        foreignKeyGroup.onDeleteClause
    }${foreignKeyGroup.onUpdateClause}`;

const createForeignKeySQL = (foreignKeyGroup) =>
    `FOREIGN KEY (${foreignKeyGroup.sourceColumns}) ${createReferencesSQL(
        foreignKeyGroup,
    )}`;

const createDeferredForeignKeySQL = (foreignKeyGroup) =>
    `ALTER TABLE ${foreignKeyGroup.tableName} ADD ${createForeignKeySQL(
        foreignKeyGroup,
    )};`;

// Only single-column foreign keys can be safely rendered inline next to the
// column definition. Composite foreign keys are rendered as table constraints.
const canRenderForeignKeyInline = (foreignKeyGroup) =>
    foreignKeyGroup.sourceColumnNames.length === 1 &&
    foreignKeyGroup.referencedColumnNames.length === 1;

const createInlineForeignKeySQL = (foreignKeyGroup) =>
    ` ${createReferencesSQL(foreignKeyGroup)}`;

const getInlineForeignKeyGroupsByColumn = (foreignKeyGroups) =>
    new Map(
        foreignKeyGroups
            .filter(canRenderForeignKeyInline)
            .map((foreignKeyGroup) => [
                foreignKeyGroup.sourceColumnNames[0],
                foreignKeyGroup,
            ]),
    );

// DROP uses CASCADE to make regeneration easier even when previous tables have
// foreign-key dependencies between them.
const createDropTablesSQL = (tables) => {
    const tableNames = [...new Set([...tables].map(getTableName))];

    if (tableNames.length === 0) {
        return "";
    }

    return `DROP TABLE IF EXISTS ${tableNames.join(", ")} CASCADE;`;
};

// Renders one CREATE TABLE statement, including columns, primary keys, UNIQUE
// constraints and the foreign keys that can be emitted safely at creation time.
const createTableSQL = (table, inlineForeignKeyGroups = []) => {
    const primaryKeyAttributes = table.attributes.filter((attr) => attr.key);
    const primaryKeyColumns = primaryKeyAttributes.map((attr) =>
        normalizeIdentifier(attr.name),
    );

    // Composite UNIQUE constraints are represented by grouping several attributes
    // under the same unique_group identifier.
    const uniqueGroups = new Map();

    for (const attr of table.attributes) {
        if (!attr.unique_group) continue;

        if (!uniqueGroups.has(attr.unique_group)) {
            uniqueGroups.set(attr.unique_group, []);
        }

        uniqueGroups.get(attr.unique_group).push(attr);
    }

    const inlineForeignKeyGroupsByColumn = getInlineForeignKeyGroupsByColumn(
        inlineForeignKeyGroups,
    );

    const tableForeignKeyGroups = inlineForeignKeyGroups.filter(
        (foreignKeyGroup) => !canRenderForeignKeyInline(foreignKeyGroup),
    );

    const columns = table.attributes
        .map((attr) => {
            let columnDef = `${normalizeIdentifier(attr.name)} ${getSQLType()}`;

            if (primaryKeyColumns.length === 1 && attr.key) {
                columnDef += " PRIMARY KEY";
            }

            if (attr.unique && !attr.unique_group) {
                columnDef += " UNIQUE";
            }

            if (attr.notnull && !attr.key) {
                columnDef += " NOT NULL";
            }

            const inlineForeignKeyGroup = inlineForeignKeyGroupsByColumn.get(
                normalizeIdentifier(attr.name),
            );

            if (inlineForeignKeyGroup) {
                columnDef += createInlineForeignKeySQL(inlineForeignKeyGroup);
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

    // Some transformations, such as ternary relations, add explicit candidate keys
    // that must be rendered as table-level UNIQUE constraints.
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

    const foreignKeyClauses = tableForeignKeyGroups
        .map(
            (foreignKeyGroup) =>
                `, \n  ${createForeignKeySQL(foreignKeyGroup)}`,
        )
        .join("");

    return `CREATE TABLE ${getTableName(
        table,
    )} (\n  ${columns}${primaryKeyClause}${groupedUniqueClauses}${explicitUniqueClauses}${foreignKeyClauses}\n);`;
};

const getForeignKeyGroupId = (foreignKeyGroup) =>
    `${foreignKeyGroup.tableName}_${foreignKeyGroup.key}`;

const collectForeignKeyGroupsByTable = (tables, primaryKeyColumnsByTable) => {
    const foreignKeyGroupsByTable = new Map();

    for (const table of tables) {
        foreignKeyGroupsByTable.set(
            getTableName(table),
            getForeignKeyGroups(table, primaryKeyColumnsByTable),
        );
    }

    return foreignKeyGroupsByTable;
};

// Returns the foreign keys that prevent a table from being created now because
// the referenced table has not been created yet.
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

        // Self-references do not block table creation because the table exists by the
        // time its own CREATE TABLE statement is completed.
        if (foreignKeyGroup.referencedTable === tableName) {
            return false;
        }

        // References to tables outside the generated model are not considered ordering
        // blockers here.
        if (!tableNames.has(foreignKeyGroup.referencedTable)) {
            return false;
        }

        return !createdTableNames.has(foreignKeyGroup.referencedTable);
    });
};

// Orders tables so that most foreign keys can be declared inside CREATE TABLE.
// If dependencies cannot be satisfied, for example due to cycles, the blocking
// foreign keys are deferred and rendered later with ALTER TABLE.
const orderTablesAndForeignKeys = (tables) => {
    const remainingTables = [...tables];
    const orderedTables = [];
    const createdTableNames = new Set();
    const tableNames = new Set(tables.map(getTableName));
    const primaryKeyColumnsByTable = createPrimaryKeyColumnsByTable(tables);
    const foreignKeyGroupsByTable = collectForeignKeyGroupsByTable(
        tables,
        primaryKeyColumnsByTable,
    );
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

        // No table can be created without unresolved dependencies. Pick one table and
        // defer its blocking foreign keys to break the cycle.
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

        // Deferred groups are excluded here because they will be emitted later as ALTER
        // TABLE statements instead of inside CREATE TABLE.
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

// Renders the final script in three parts: DROP statements, ordered CREATE TABLE
// statements and deferred ALTER TABLE statements for unresolved foreign keys.
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

// Public SQL rendering entry point used by the application service layer.
export function renderRelationalModelToSQL(relationalModel) {
    return renderSqlScript(relationalModel.tables);
}
