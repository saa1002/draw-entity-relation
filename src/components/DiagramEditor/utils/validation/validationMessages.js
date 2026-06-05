const CONTEXT_HEADERS = {
    sql: "No se ha podido generar el script SQL por los siguientes errores:",
    exportJson:
        "No se ha podido exportar el diagrama en formato JSON por los siguientes errores:",
    importJson:
        "No se ha podido importar el diagrama por los siguientes errores:",
};

const CONTEXT_SUCCESS_MESSAGES = {
    sql: "El diagrama es válido. Se generará un archivo SQL con las tablas y restricciones derivadas del modelo E/R.",
    exportJson:
        "El diagrama es válido. Se exportará el diagrama actual en formato JSON para poder importarlo más adelante.",
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
        key: "noNestedCompositeAttributes",
        message: "Hay atributos compuestos con subatributos anidados.",
    },
    {
        key: "noUnsupportedMultivaluedAttributes",
        message:
            "Solo se soportan atributos multivaluados top-level de entidad, simples o compuestos, sin clave ni discriminante.",
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
        key: "noUnconnectedIsas",
        message:
            "Hay jerarquías ISA que no tienen una generalización y al menos una especialización conectadas.",
    },
    {
        key: "noBrokenIsaEntityReferences",
        message: "Hay jerarquías ISA que apuntan a entidades inexistentes.",
    },
    {
        key: "noIsaHierarchiesWithRepeatedSpecializations",
        message: "Hay jerarquías ISA con especializaciones repetidas.",
    },
    {
        key: "noIsaHierarchiesWithGeneralizationAsSpecialization",
        message:
            "Hay jerarquías ISA en las que la generalización también aparece como especialización.",
    },
    {
        key: "noIsaSpecializationsInMultipleHierarchies",
        message:
            "Hay entidades que aparecen como especialización en más de una jerarquía ISA; la herencia múltiple no está soportada.",
    },
    {
        key: "noIsaSpecializationsWithPrimaryKey",
        message:
            "Hay especializaciones ISA con clave primaria propia; deben heredar la clave de la generalización.",
    },
    {
        key: "noTernaryRelationsWithAmbiguousRepeatedParticipants",
        message:
            "Hay relaciones ternarias con entidades participantes repetidas sin roles distintos.",
    },
    {
        key: "noIdentifyingTernaryRelations",
        message:
            "Las relaciones ternarias no pueden ser relaciones de dependencia por identificación.",
    },
    {
        key: "noTernaryRelationsWithMandatoryCardinalities",
        message: "Hay relaciones ternarias con cardinalidades obligatorias.",
    },
    {
        key: "noNotValidCardinalities",
        message: "Hay cardinalidades no válidas en las relaciones.",
    },
];
const SECTION_TITLES = {
    general: "General",
    entities: "Entidades y atributos",
    relations: "Relaciones",
    isa: "ISA",
    sql: "SQL",
};

const DIAGNOSTIC_SECTIONS = {
    notEmpty: "general",
    noRepeatedNames: "general",
    noSQLIdentifierCollisions: "sql",

    noRepeatedAttrNames: "entities",
    noEmptyCompositeAttributes: "entities",
    noNestedCompositeAttributes: "entities",
    noUnsupportedMultivaluedAttributes: "entities",
    noEntitiesWithoutAttributes: "entities",
    noEntitiesWithoutPK: "entities",
    noEntitiesWithMoreThanOnePK: "entities",
    noWeakEntitiesWithPrimaryKey: "entities",
    noWeakEntitiesWithoutPartialKey: "entities",
    noWeakEntitiesWithMoreThanOnePartialKey: "entities",
    noStrongEntitiesWithPartialKey: "entities",
    noWeakEntitiesWithoutIdentifyingRelation: "entities",
    noInconsistentWeakEntityOwnership: "entities",

    noNMRelationsWithPK: "relations",
    noAttributesInNonNMRelations: "relations",
    noUnconnectedRelations: "relations",
    noBrokenRelationEntityReferences: "relations",
    noInvalidIdentifyingRelations: "relations",
    noInvalidIdentifyingCardinalities: "relations",
    noMultipleIdentifyingRelationsPerWeakEntity: "relations",
    noTernaryRelationsWithAmbiguousRepeatedParticipants: "relations",
    noIdentifyingTernaryRelations: "relations",
    noTernaryRelationsWithMandatoryCardinalities: "relations",
    noNotValidCardinalities: "relations",

    noUnconnectedIsas: "isa",
    noBrokenIsaEntityReferences: "isa",
    noIsaHierarchiesWithRepeatedSpecializations: "isa",
    noIsaHierarchiesWithGeneralizationAsSpecialization: "isa",
    noIsaSpecializationsInMultipleHierarchies: "isa",
    noIsaSpecializationsWithPrimaryKey: "isa",
};

const getEntities = (diagram) =>
    Array.isArray(diagram?.entities) ? diagram.entities : [];

const getRelations = (diagram) =>
    Array.isArray(diagram?.relations) ? diagram.relations : [];

const getIsas = (diagram) => (Array.isArray(diagram?.isas) ? diagram.isas : []);

const getName = (element, fallback) =>
    String(element?.name ?? "").trim() || fallback;

const quote = (value) => `"${value}"`;

const getEntityLabel = (entity) => quote(getName(entity, "Entidad sin nombre"));

const getRelationLabel = (relation) =>
    quote(getName(relation, "Relación sin nombre"));

const getIsaLabel = (index) => `ISA ${index + 1}`;

const getAttributeChildren = (attribute) =>
    Array.isArray(attribute?.children) ? attribute.children : [];

const visitAttributes = (attributes, callback, path = []) => {
    if (!Array.isArray(attributes)) {
        return;
    }

    attributes.forEach((attribute) => {
        const currentPath = [
            ...path,
            getName(attribute, "Atributo sin nombre"),
        ];

        callback(attribute, currentPath);

        visitAttributes(getAttributeChildren(attribute), callback, currentPath);
    });
};

const hasPrimaryKeyAttribute = (attributes) => {
    let found = false;

    visitAttributes(attributes, (attribute) => {
        if (attribute?.key === true) {
            found = true;
        }
    });

    return found;
};

const getPrimaryKeyAttributes = (attributes) => {
    const keys = [];

    visitAttributes(attributes, (attribute, path) => {
        if (attribute?.key === true) {
            keys.push(path.join("."));
        }
    });

    return keys;
};

const hasPartialKeyAttribute = (attributes) => {
    let found = false;

    visitAttributes(attributes, (attribute) => {
        if (attribute?.partialKey === true) {
            found = true;
        }
    });

    return found;
};

const getPartialKeyAttributes = (attributes) => {
    const keys = [];

    visitAttributes(attributes, (attribute, path) => {
        if (attribute?.partialKey === true) {
            keys.push(path.join("."));
        }
    });

    return keys;
};

const getRepeatedAttributeNames = (attributes) => {
    const repeatedNames = new Set();

    const inspectSiblings = (siblings) => {
        if (!Array.isArray(siblings)) {
            return;
        }

        const seen = new Set();

        siblings.forEach((attribute) => {
            const name = getName(attribute, "");

            if (name && seen.has(name)) {
                repeatedNames.add(name);
            }

            seen.add(name);
        });

        siblings.forEach((attribute) => {
            inspectSiblings(getAttributeChildren(attribute));
        });
    };

    inspectSiblings(attributes);

    return [...repeatedNames];
};

const getCompositeAttributesWithoutChildren = (attributes) => {
    const result = [];

    visitAttributes(attributes, (attribute, path) => {
        if (
            Array.isArray(attribute?.children) &&
            attribute.children.length === 0
        ) {
            result.push(path.join("."));
        }
    });

    return result;
};

const getNestedCompositeAttributes = (attributes) => {
    const result = [];

    const inspect = (currentAttributes, depth = 0, path = []) => {
        if (!Array.isArray(currentAttributes)) {
            return;
        }

        currentAttributes.forEach((attribute) => {
            const currentPath = [
                ...path,
                getName(attribute, "Atributo sin nombre"),
            ];
            const children = getAttributeChildren(attribute);

            if (depth > 0 && children.length > 0) {
                result.push(currentPath.join("."));
            }

            inspect(children, depth + 1, currentPath);
        });
    };

    inspect(attributes);

    return result;
};

const getAttributeOwnerDetails = (diagram, predicate) => {
    const details = [];

    getEntities(diagram).forEach((entity) => {
        const result = predicate(entity.attributes ?? []);

        if (result.length > 0) {
            details.push(`${getEntityLabel(entity)}: ${result.join(", ")}.`);
        }
    });

    getRelations(diagram).forEach((relation) => {
        const result = predicate(relation.attributes ?? []);

        if (result.length > 0) {
            details.push(
                `${getRelationLabel(relation)}: ${result.join(", ")}.`,
            );
        }
    });

    return details;
};

const getIsaSpecializationIds = (isa) =>
    (Array.isArray(isa?.specializations) ? isa.specializations : [])
        .map((specialization) => specialization?.entity?.idMx ?? "")
        .filter(Boolean);

const getIsaGeneralizationId = (isa) => isa?.generalization?.entity?.idMx ?? "";

const getEntityById = (diagram, entityId) =>
    getEntities(diagram).find((entity) => entity.idMx === entityId) ?? null;

const getEntityNameById = (diagram, entityId) =>
    getName(getEntityById(diagram, entityId), "Entidad inexistente");

const isEntityIsaSpecialization = (diagram, entityId) =>
    getIsas(diagram).some((isa) =>
        getIsaSpecializationIds(isa).includes(entityId),
    );

const getRelationSideKeys = (relation) =>
    relation?.arity === 3 ? ["side1", "side2", "side3"] : ["side1", "side2"];

const getRelationSides = (relation) =>
    getRelationSideKeys(relation).map((sideKey) => relation?.[sideKey] ?? {});

const isRelationConfigured = (relation) =>
    getRelationSides(relation).every(
        (side) => !!side?.entity?.idMx && !!side?.idMx,
    );

const isTernaryRelation = (relation) => relation?.arity === 3;

const getCardinalityParts = (cardinality) => {
    const [minimum = "", maximum = ""] = String(cardinality ?? "").split(":");

    return { minimum, maximum };
};

const canRelationHoldAttributes = (relation) => {
    if (isTernaryRelation(relation)) {
        return true;
    }

    return getRelationSides(relation).every((side) =>
        String(side?.cardinality ?? "").endsWith(":N"),
    );
};

const getRepeatedDiagramNames = (diagram) => {
    const repeatedNames = new Set();
    const seen = new Set();

    [...getEntities(diagram), ...getRelations(diagram)].forEach((element) => {
        const name = getName(element, "");

        if (!name) {
            return;
        }

        if (seen.has(name)) {
            repeatedNames.add(name);
        }

        seen.add(name);
    });

    return [...repeatedNames];
};

const getTernaryRepeatedParticipantDetails = (diagram) =>
    getRelations(diagram)
        .filter(isTernaryRelation)
        .filter(isRelationConfigured)
        .flatMap((relation) => {
            const sidesByEntityId = {};

            getRelationSides(relation).forEach((side) => {
                const entityId = side?.entity?.idMx ?? "";

                if (!entityId) {
                    return;
                }

                sidesByEntityId[entityId] = [
                    ...(sidesByEntityId[entityId] ?? []),
                    side,
                ];
            });

            return Object.entries(sidesByEntityId)
                .filter(([, sides]) => {
                    if (sides.length <= 1) {
                        return false;
                    }

                    const roles = sides.map((side) =>
                        String(side?.role ?? "").trim(),
                    );

                    return (
                        roles.some((role) => !role) ||
                        new Set(roles).size !== roles.length
                    );
                })
                .map(
                    ([entityId]) =>
                        `${getRelationLabel(
                            relation,
                        )}: repite la entidad ${quote(
                            getEntityNameById(diagram, entityId),
                        )} sin roles distintos.`,
                );
        });

const getValidationDetailMessages = (diagnosticKey, diagram) => {
    if (!diagram) {
        return [];
    }

    switch (diagnosticKey) {
        case "noRepeatedNames": {
            const names = getRepeatedDiagramNames(diagram);
            return names.length > 0
                ? [`Nombres repetidos: ${names.map(quote).join(", ")}.`]
                : [];
        }

        case "noRepeatedAttrNames":
            return getAttributeOwnerDetails(diagram, (attributes) => {
                const names = getRepeatedAttributeNames(attributes);
                return names.length > 0
                    ? [`atributos repetidos ${names.map(quote).join(", ")}`]
                    : [];
            });

        case "noEmptyCompositeAttributes":
            return getAttributeOwnerDetails(diagram, (attributes) => {
                const names = getCompositeAttributesWithoutChildren(attributes);
                return names.length > 0
                    ? [
                          `atributos compuestos sin subatributos ${names
                              .map(quote)
                              .join(", ")}`,
                      ]
                    : [];
            });

        case "noNestedCompositeAttributes":
            return getAttributeOwnerDetails(diagram, (attributes) => {
                const names = getNestedCompositeAttributes(attributes);
                return names.length > 0
                    ? [
                          `atributos compuestos anidados ${names
                              .map(quote)
                              .join(", ")}`,
                      ]
                    : [];
            });

        case "noEntitiesWithoutAttributes":
            return getEntities(diagram)
                .filter(
                    (entity) =>
                        !isEntityIsaSpecialization(diagram, entity.idMx) &&
                        (!entity.attributes || entity.attributes.length === 0),
                )
                .map(
                    (entity) =>
                        `${getEntityLabel(entity)}: no tiene atributos.`,
                );

        case "noEntitiesWithoutPK":
            return getEntities(diagram)
                .filter((entity) => !entity.weak)
                .filter(
                    (entity) =>
                        !isEntityIsaSpecialization(diagram, entity.idMx),
                )
                .filter((entity) => !hasPrimaryKeyAttribute(entity.attributes))
                .map(
                    (entity) =>
                        `${getEntityLabel(entity)}: no tiene clave primaria.`,
                );

        case "noEntitiesWithMoreThanOnePK":
            return getEntities(diagram)
                .filter(
                    (entity) =>
                        !isEntityIsaSpecialization(diagram, entity.idMx),
                )
                .map((entity) => ({
                    entity,
                    keys: getPrimaryKeyAttributes(entity.attributes),
                }))
                .filter(({ keys }) => keys.length > 1)
                .map(
                    ({ entity, keys }) =>
                        `${getEntityLabel(
                            entity,
                        )}: tiene varias claves primarias (${keys
                            .map(quote)
                            .join(", ")}).`,
                );

        case "noWeakEntitiesWithPrimaryKey":
            return getEntities(diagram)
                .filter((entity) => entity.weak)
                .filter((entity) => hasPrimaryKeyAttribute(entity.attributes))
                .map(
                    (entity) =>
                        `${getEntityLabel(
                            entity,
                        )}: es débil y tiene clave primaria normal.`,
                );

        case "noWeakEntitiesWithoutPartialKey":
            return getEntities(diagram)
                .filter((entity) => entity.weak)
                .filter((entity) => !hasPartialKeyAttribute(entity.attributes))
                .map(
                    (entity) =>
                        `${getEntityLabel(
                            entity,
                        )}: es débil y no tiene discriminante.`,
                );

        case "noWeakEntitiesWithMoreThanOnePartialKey":
            return getEntities(diagram)
                .filter((entity) => entity.weak)
                .map((entity) => ({
                    entity,
                    keys: getPartialKeyAttributes(entity.attributes),
                }))
                .filter(({ keys }) => keys.length > 1)
                .map(
                    ({ entity, keys }) =>
                        `${getEntityLabel(
                            entity,
                        )}: tiene varios discriminantes (${keys
                            .map(quote)
                            .join(", ")}).`,
                );

        case "noStrongEntitiesWithPartialKey":
            return getEntities(diagram)
                .filter((entity) => !entity.weak)
                .filter((entity) => hasPartialKeyAttribute(entity.attributes))
                .map(
                    (entity) =>
                        `${getEntityLabel(
                            entity,
                        )}: es fuerte y tiene atributo discriminante.`,
                );

        case "noWeakEntitiesWithoutIdentifyingRelation":
            return getEntities(diagram)
                .filter((entity) => entity.weak)
                .filter((entity) => !entity.identifyingRelationId)
                .map(
                    (entity) =>
                        `${getEntityLabel(
                            entity,
                        )}: no tiene relación identificadora asociada.`,
                );

        case "noUnconnectedRelations":
            return getRelations(diagram)
                .filter((relation) => !isRelationConfigured(relation))
                .map(
                    (relation) =>
                        `${getRelationLabel(
                            relation,
                        )}: no tiene todos sus lados conectados.`,
                );

        case "noAttributesInNonNMRelations":
            return getRelations(diagram)
                .filter((relation) => !canRelationHoldAttributes(relation))
                .filter((relation) => (relation.attributes ?? []).length > 0)
                .map(
                    (relation) =>
                        `${getRelationLabel(
                            relation,
                        )}: tiene atributos propios aunque su tipo no los soporta.`,
                );

        case "noNMRelationsWithPK":
            return getRelations(diagram)
                .filter((relation) => relation.canHoldAttributes)
                .filter((relation) =>
                    hasPrimaryKeyAttribute(relation.attributes),
                )
                .map(
                    (relation) =>
                        `${getRelationLabel(
                            relation,
                        )}: tiene atributos marcados como clave primaria.`,
                );

        case "noBrokenRelationEntityReferences":
            return getRelations(diagram)
                .filter((relation) =>
                    getRelationSides(relation).some((side) => {
                        const entityId = side?.entity?.idMx ?? "";

                        return entityId && !getEntityById(diagram, entityId);
                    }),
                )
                .map(
                    (relation) =>
                        `${getRelationLabel(
                            relation,
                        )}: apunta a una entidad que ya no existe.`,
                );

        case "noTernaryRelationsWithAmbiguousRepeatedParticipants":
            return getTernaryRepeatedParticipantDetails(diagram);

        case "noIdentifyingTernaryRelations":
            return getRelations(diagram)
                .filter(
                    (relation) =>
                        isTernaryRelation(relation) &&
                        relation.isIdentifying === true,
                )
                .map(
                    (relation) =>
                        `${getRelationLabel(
                            relation,
                        )}: es ternaria y está marcada como identificadora.`,
                );

        case "noTernaryRelationsWithMandatoryCardinalities":
            return getRelations(diagram)
                .filter(isTernaryRelation)
                .filter(isRelationConfigured)
                .filter((relation) =>
                    getRelationSides(relation).some(
                        (side) =>
                            getCardinalityParts(side?.cardinality).minimum ===
                            "1",
                    ),
                )
                .map(
                    (relation) =>
                        `${getRelationLabel(
                            relation,
                        )}: tiene alguna cardinalidad mínima obligatoria.`,
                );

        case "noNotValidCardinalities":
            return getRelations(diagram)
                .filter((relation) =>
                    getRelationSides(relation).some(
                        (side) =>
                            !["0:1", "0:N", "1:1", "1:N"].includes(
                                side?.cardinality,
                            ),
                    ),
                )
                .map(
                    (relation) =>
                        `${getRelationLabel(
                            relation,
                        )}: contiene cardinalidades no válidas.`,
                );

        case "noUnconnectedIsas":
            return getIsas(diagram)
                .map((isa, index) => ({ isa, index }))
                .filter(
                    ({ isa }) =>
                        !getIsaGeneralizationId(isa) ||
                        getIsaSpecializationIds(isa).length === 0 ||
                        !isa?.generalization?.edgeId ||
                        !(isa.specializations ?? []).every(
                            (specialization) =>
                                !!specialization?.entity?.idMx &&
                                !!specialization?.edgeId,
                        ),
                )
                .map(
                    ({ index }) =>
                        `${getIsaLabel(
                            index,
                        )}: debe tener una generalización y al menos una especialización conectadas.`,
                );

        case "noBrokenIsaEntityReferences":
            return getIsas(diagram)
                .map((isa, index) => ({ isa, index }))
                .filter(({ isa }) =>
                    [
                        getIsaGeneralizationId(isa),
                        ...getIsaSpecializationIds(isa),
                    ]
                        .filter(Boolean)
                        .some((entityId) => !getEntityById(diagram, entityId)),
                )
                .map(
                    ({ index }) =>
                        `${getIsaLabel(
                            index,
                        )}: apunta a una entidad que ya no existe.`,
                );

        case "noIsaHierarchiesWithRepeatedSpecializations":
            return getIsas(diagram)
                .map((isa, index) => ({
                    isa,
                    index,
                    specializationIds: getIsaSpecializationIds(isa),
                }))
                .filter(
                    ({ specializationIds }) =>
                        new Set(specializationIds).size !==
                        specializationIds.length,
                )
                .map(
                    ({ index }) =>
                        `${getIsaLabel(
                            index,
                        )}: contiene especializaciones repetidas.`,
                );

        case "noIsaHierarchiesWithGeneralizationAsSpecialization":
            return getIsas(diagram)
                .map((isa, index) => ({ isa, index }))
                .filter(({ isa }) =>
                    getIsaSpecializationIds(isa).includes(
                        getIsaGeneralizationId(isa),
                    ),
                )
                .map(
                    ({ isa, index }) =>
                        `${getIsaLabel(index)}: ${quote(
                            getEntityNameById(
                                diagram,
                                getIsaGeneralizationId(isa),
                            ),
                        )} aparece como generalización y especialización.`,
                );

        case "noIsaSpecializationsInMultipleHierarchies": {
            const specializationCountById = {};

            getIsas(diagram).forEach((isa) => {
                new Set(getIsaSpecializationIds(isa)).forEach((entityId) => {
                    specializationCountById[entityId] =
                        (specializationCountById[entityId] ?? 0) + 1;
                });
            });

            return Object.entries(specializationCountById)
                .filter(([, count]) => count > 1)
                .map(
                    ([entityId]) =>
                        `${quote(
                            getEntityNameById(diagram, entityId),
                        )}: aparece como especialización en más de una ISA.`,
                );
        }

        case "noIsaSpecializationsWithPrimaryKey": {
            const specializationIds = new Set(
                getIsas(diagram).flatMap(getIsaSpecializationIds),
            );

            return [...specializationIds]
                .map((entityId) => getEntityById(diagram, entityId))
                .filter(Boolean)
                .filter((entity) => hasPrimaryKeyAttribute(entity.attributes))
                .map(
                    (entity) =>
                        `${getEntityLabel(
                            entity,
                        )}: es especialización ISA y tiene clave primaria propia.`,
                );
        }

        case "noSQLIdentifierCollisions":
            return [
                "Revisa nombres que solo se diferencien por mayúsculas, acentos, espacios o caracteres especiales.",
            ];

        default:
            return [];
    }
};

export const getValidationDialogMessages = (
    diagnostics,
    context,
    diagram = null,
) => {
    if (diagnostics.isValid) {
        return CONTEXT_SUCCESS_MESSAGES[context]
            ? [CONTEXT_SUCCESS_MESSAGES[context]]
            : [];
    }

    const groupedMessages = {
        general: [],
        entities: [],
        relations: [],
        isa: [],
        sql: [],
    };

    VALIDATION_MESSAGE_DEFINITIONS.forEach(
        ({ key, message, messagesByContext }) => {
            if (diagnostics[key] !== false) {
                return;
            }

            const section = DIAGNOSTIC_SECTIONS[key] ?? "general";
            const baseMessage = messagesByContext?.[context] ?? message;
            const detailMessages = getValidationDetailMessages(key, diagram);

            groupedMessages[section].push(baseMessage);
            groupedMessages[section].push(
                ...detailMessages.map((detailMessage) => `- ${detailMessage}`),
            );
        },
    );

    const messages = [CONTEXT_HEADERS[context]];

    Object.entries(groupedMessages).forEach(([section, sectionMessages]) => {
        if (sectionMessages.length === 0) {
            return;
        }

        messages.push(SECTION_TITLES[section]);
        messages.push(...sectionMessages);
    });

    return messages;
};
