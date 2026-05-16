import { normalizeIdentifier } from "../domain/relational/naming";

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

function renderSqlScript(tables) {
    const dropTablesScript = createDropTablesSQL(tables);

    const createTablesScript = tables.map(createTableSQL).join("\n\n");

    const foreignKeyScript = tables
        .map(createForeignKeySQL)
        .filter(Boolean)
        .join("\n");

    return [dropTablesScript, createTablesScript, foreignKeyScript]
        .filter(Boolean)
        .join("\n\n");
}

export function renderRelationalModelToSQL(relationalModel) {
    return renderSqlScript(relationalModel.tables);
}
