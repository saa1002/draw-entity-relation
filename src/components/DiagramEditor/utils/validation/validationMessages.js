const CONTEXT_HEADERS = {
    sql: "No se ha podido generar el script SQL por los siguientes errores:",
    exportJson:
        "No se ha podido exportar el diagrama en formato JSON por los siguientes errores:",
    importJson:
        "No se ha podido importar el diagrama por los siguientes errores:",
};

const CONTEXT_SUCCESS_MESSAGES = {
    sql: "¿Deseas pasar a tablas el diagrama E-R?",
    exportJson: "¿Deseas exportar el diagrama en formato JSON?",
};

const VALIDATION_MESSAGE_DEFINITIONS = [
    {
        key: "notEmpty",
        message: "El diagrama está vacío.",
    },
    {
        key: "noRepeatedNames",
        messagesByContext: {
            sql: "Hay entidades o relaciones con nombres repetidos.",
            exportJson: "Hay entidades con nombres repetidos.",
            importJson: "Hay entidades con nombres repetidos.",
        },
    },
    {
        key: "noRepeatedAttrNames",
        message: "Hay atributos repetidos en una entidad.",
    },
    {
        key: "noEmptyCompositeAttributes",
        message: "Hay atributos compuestos sin subatributos.",
    },
    {
        key: "noUnsupportedMultivaluedAttributes",
        message:
            "Solo se soportan atributos multivaluados simples de entidad, sin clave ni discriminante.",
    },
    {
        key: "noEntitiesWithoutAttributes",
        message: "Hay entidades sin atributos.",
    },
    {
        key: "noEntitiesWithoutPK",
        message: "Hay entidades sin clave primaria.",
    },
    {
        key: "noEntitiesWithMoreThanOnePK",
        message: "Hay entidades con más de una clave primaria.",
    },
    {
        key: "noNMRelationsWithPK",
        message: "Hay relaciones N-M con clave primaria.",
    },
    {
        key: "noWeakEntitiesWithPrimaryKey",
        message: "Hay entidades débiles con clave primaria normal.",
    },
    {
        key: "noWeakEntitiesWithoutPartialKey",
        message: "Hay entidades débiles sin atributo discriminante.",
    },
    {
        key: "noWeakEntitiesWithMoreThanOnePartialKey",
        message: "Hay entidades débiles con más de un atributo discriminante.",
    },
    {
        key: "noStrongEntitiesWithPartialKey",
        message: "Hay entidades fuertes con atributo discriminante.",
    },
    {
        key: "noWeakEntitiesWithoutIdentifyingRelation",
        message:
            "Hay entidades débiles sin relación de dependencia por identificación.",
    },
    {
        key: "noInvalidIdentifyingRelations",
        message:
            "Hay relaciones de dependencia por identificación que no conectan una entidad débil dependiente con una entidad propietaria distinta.",
    },
    {
        key: "noInvalidIdentifyingCardinalities",
        message:
            "Hay relaciones de dependencia por identificación con cardinalidades no válidas.",
    },
    {
        key: "noInconsistentWeakEntityOwnership",
        message:
            "Hay entidades débiles cuya entidad propietaria es inconsistente.",
    },
    {
        key: "noMultipleIdentifyingRelationsPerWeakEntity",
        message:
            "Hay entidades débiles con más de una relación de dependencia por identificación como entidad dependiente.",
    },
    {
        key: "noAttributesInNonNMRelations",
        message:
            "Hay relaciones 1:1 o 1:N con atributos, lo cual no está soportado.",
    },
    {
        key: "noUnconnectedRelations",
        message: "Hay relaciones desconectadas.",
    },
    {
        key: "noSQLIdentifierCollisions",
        message:
            "Hay nombres que colisionan al normalizar identificadores SQL.",
    },
    {
        key: "noBrokenRelationEntityReferences",
        message: "Hay relaciones que apuntan a entidades inexistentes.",
    },
    {
        key: "noNotValidCardinalities",
        message: "Hay cardinalidades no válidas en las relaciones.",
    },
];

export const getValidationDialogMessages = (diagnostics, context) => {
    if (diagnostics.isValid) {
        return CONTEXT_SUCCESS_MESSAGES[context]
            ? [CONTEXT_SUCCESS_MESSAGES[context]]
            : [];
    }

    const messages = [CONTEXT_HEADERS[context]];

    VALIDATION_MESSAGE_DEFINITIONS.forEach(
        ({ key, message, messagesByContext }) => {
            if (diagnostics[key] === false) {
                messages.push(messagesByContext?.[context] ?? message);
            }
        },
    );

    return messages;
};
