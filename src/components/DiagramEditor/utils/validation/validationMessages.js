import { DEFAULT_LANGUAGE, translate } from "../../../../i18n/translations";

const translateInDefaultLanguage = (key, values = {}) =>
    translate(DEFAULT_LANGUAGE, key, values);

const CONTEXT_HEADER_KEYS = {
    sql: "validation.context.sql.errorHeader",
    exportJson: "validation.context.exportJson.errorHeader",
    importJson: "validation.context.importJson.errorHeader",
};

const CONTEXT_SUCCESS_MESSAGE_KEYS = {
    sql: "validation.context.sql.success",
    exportJson: "validation.context.exportJson.success",
};

export const VALIDATION_SECTION_TITLE_KEYS = {
    general: "validation.section.general",
    entities: "validation.section.entities",
    relations: "validation.section.relations",
    isa: "validation.section.isa",
    sql: "validation.section.sql",
};

const VALIDATION_MESSAGE_DEFINITIONS = [
    { key: "notEmpty" },
    {
        key: "noRepeatedNames",
        messageKeysByContext: {
            sql: "validation.message.noRepeatedNames.sql",
            exportJson: "validation.message.noRepeatedNames.exportJson",
            importJson: "validation.message.noRepeatedNames.importJson",
        },
    },
    { key: "noRepeatedAttrNames" },
    { key: "noEmptyCompositeAttributes" },
    { key: "noNestedCompositeAttributes" },
    { key: "noUnsupportedMultivaluedAttributes" },
    { key: "noEntitiesWithoutAttributes" },
    { key: "noEntitiesWithoutPK" },
    { key: "noEntitiesWithMoreThanOnePK" },
    { key: "noNMRelationsWithPK" },
    { key: "noWeakEntitiesWithPrimaryKey" },
    { key: "noWeakEntitiesWithoutPartialKey" },
    { key: "noWeakEntitiesWithMoreThanOnePartialKey" },
    { key: "noStrongEntitiesWithPartialKey" },
    { key: "noWeakEntitiesWithoutIdentifyingRelation" },
    { key: "noInvalidIdentifyingRelations" },
    { key: "noInvalidIdentifyingCardinalities" },
    { key: "noInconsistentWeakEntityOwnership" },
    { key: "noMultipleIdentifyingRelationsPerWeakEntity" },
    { key: "noAttributesInNonNMRelations" },
    { key: "noUnconnectedRelations" },
    { key: "noSQLIdentifierCollisions" },
    { key: "noBrokenRelationEntityReferences" },
    { key: "noUnconnectedIsas" },
    { key: "noBrokenIsaEntityReferences" },
    { key: "noIsaHierarchiesWithRepeatedSpecializations" },
    { key: "noIsaHierarchiesWithGeneralizationAsSpecialization" },
    { key: "noIsaSpecializationsInMultipleHierarchies" },
    { key: "noIsaSpecializationsWithPrimaryKey" },
    { key: "noTernaryRelationsWithAmbiguousRepeatedParticipants" },
    { key: "noIdentifyingTernaryRelations" },
    { key: "noTernaryRelationsWithMandatoryCardinalities" },
    { key: "noNotValidCardinalities" },
];

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

const formatQuotedList = (values) => values.map(quote).join(", ");

const getEntityLabel = (entity, t = translateInDefaultLanguage) =>
    quote(getName(entity, t("validation.fallback.entityUnnamed")));

const getRelationLabel = (relation, t = translateInDefaultLanguage) =>
    quote(getName(relation, t("validation.fallback.relationUnnamed")));

const getIsaLabel = (index) => `ISA ${index + 1}`;

const getAttributeChildren = (attribute) =>
    Array.isArray(attribute?.children) ? attribute.children : [];

const visitAttributes = (
    attributes,
    callback,
    path = [],
    t = translateInDefaultLanguage,
) => {
    if (!Array.isArray(attributes)) {
        return;
    }

    attributes.forEach((attribute) => {
        const currentPath = [
            ...path,
            getName(attribute, t("validation.fallback.attributeUnnamed")),
        ];

        callback(attribute, currentPath);

        visitAttributes(
            getAttributeChildren(attribute),
            callback,
            currentPath,
            t,
        );
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

const getPrimaryKeyAttributes = (
    attributes,
    t = translateInDefaultLanguage,
) => {
    const keys = [];

    visitAttributes(
        attributes,
        (attribute, path) => {
            if (attribute?.key === true) {
                keys.push(path.join("."));
            }
        },
        [],
        t,
    );

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

const getPartialKeyAttributes = (
    attributes,
    t = translateInDefaultLanguage,
) => {
    const keys = [];

    visitAttributes(
        attributes,
        (attribute, path) => {
            if (attribute?.partialKey === true) {
                keys.push(path.join("."));
            }
        },
        [],
        t,
    );

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

const getCompositeAttributesWithoutChildren = (
    attributes,
    t = translateInDefaultLanguage,
) => {
    const result = [];

    visitAttributes(
        attributes,
        (attribute, path) => {
            if (
                Array.isArray(attribute?.children) &&
                attribute.children.length === 0
            ) {
                result.push(path.join("."));
            }
        },
        [],
        t,
    );

    return result;
};

const getNestedCompositeAttributes = (
    attributes,
    t = translateInDefaultLanguage,
) => {
    const result = [];

    const inspect = (currentAttributes, depth = 0, path = []) => {
        if (!Array.isArray(currentAttributes)) {
            return;
        }

        currentAttributes.forEach((attribute) => {
            const currentPath = [
                ...path,
                getName(attribute, t("validation.fallback.attributeUnnamed")),
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

const getAttributeOwnerDetails = (diagram, predicate, t) => {
    const details = [];

    getEntities(diagram).forEach((entity) => {
        const result = predicate(entity.attributes ?? []);

        if (result.length > 0) {
            details.push(
                t("validation.detail.attributeOwnerList", {
                    owner: getEntityLabel(entity, t),
                    details: result.join(", "),
                }),
            );
        }
    });

    getRelations(diagram).forEach((relation) => {
        const result = predicate(relation.attributes ?? []);

        if (result.length > 0) {
            details.push(
                t("validation.detail.attributeOwnerList", {
                    owner: getRelationLabel(relation, t),
                    details: result.join(", "),
                }),
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

const getEntityNameById = (diagram, entityId, t = translateInDefaultLanguage) =>
    getName(
        getEntityById(diagram, entityId),
        t("validation.fallback.entityMissing"),
    );

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

const getTernaryRepeatedParticipantDetails = (diagram, t) =>
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
                .map(([entityId]) =>
                    t(
                        "validation.detail.ternaryRepeatedParticipantWithoutDistinctRoles",
                        {
                            relation: getRelationLabel(relation, t),
                            entity: quote(
                                getEntityNameById(diagram, entityId, t),
                            ),
                        },
                    ),
                );
        });

const getValidationDetailMessages = (
    diagnosticKey,
    diagram,
    t = translateInDefaultLanguage,
) => {
    if (!diagram) {
        return [];
    }

    switch (diagnosticKey) {
        case "noRepeatedNames": {
            const names = getRepeatedDiagramNames(diagram);
            return names.length > 0
                ? [
                      t("validation.detail.repeatedNames", {
                          names: formatQuotedList(names),
                      }),
                  ]
                : [];
        }

        case "noRepeatedAttrNames":
            return getAttributeOwnerDetails(
                diagram,
                (attributes) => {
                    const names = getRepeatedAttributeNames(attributes);
                    return names.length > 0
                        ? [
                              t("validation.detail.repeatedAttributes", {
                                  attributes: formatQuotedList(names),
                              }),
                          ]
                        : [];
                },
                t,
            );

        case "noEmptyCompositeAttributes":
            return getAttributeOwnerDetails(
                diagram,
                (attributes) => {
                    const names = getCompositeAttributesWithoutChildren(
                        attributes,
                        t,
                    );
                    return names.length > 0
                        ? [
                              t("validation.detail.emptyCompositeAttributes", {
                                  attributes: formatQuotedList(names),
                              }),
                          ]
                        : [];
                },
                t,
            );

        case "noNestedCompositeAttributes":
            return getAttributeOwnerDetails(
                diagram,
                (attributes) => {
                    const names = getNestedCompositeAttributes(attributes, t);
                    return names.length > 0
                        ? [
                              t("validation.detail.nestedCompositeAttributes", {
                                  attributes: formatQuotedList(names),
                              }),
                          ]
                        : [];
                },
                t,
            );

        case "noEntitiesWithoutAttributes":
            return getEntities(diagram)
                .filter(
                    (entity) =>
                        !isEntityIsaSpecialization(diagram, entity.idMx) &&
                        (!entity.attributes || entity.attributes.length === 0),
                )
                .map((entity) =>
                    t("validation.detail.entityWithoutAttributes", {
                        entity: getEntityLabel(entity, t),
                    }),
                );

        case "noEntitiesWithoutPK":
            return getEntities(diagram)
                .filter((entity) => !entity.weak)
                .filter(
                    (entity) =>
                        !isEntityIsaSpecialization(diagram, entity.idMx),
                )
                .filter((entity) => !hasPrimaryKeyAttribute(entity.attributes))
                .map((entity) =>
                    t("validation.detail.entityWithoutPrimaryKey", {
                        entity: getEntityLabel(entity, t),
                    }),
                );

        case "noEntitiesWithMoreThanOnePK":
            return getEntities(diagram)
                .filter(
                    (entity) =>
                        !isEntityIsaSpecialization(diagram, entity.idMx),
                )
                .map((entity) => ({
                    entity,
                    keys: getPrimaryKeyAttributes(entity.attributes, t),
                }))
                .filter(({ keys }) => keys.length > 1)
                .map(({ entity, keys }) =>
                    t("validation.detail.entityWithMultiplePrimaryKeys", {
                        entity: getEntityLabel(entity, t),
                        keys: formatQuotedList(keys),
                    }),
                );

        case "noWeakEntitiesWithPrimaryKey":
            return getEntities(diagram)
                .filter((entity) => entity.weak)
                .filter((entity) => hasPrimaryKeyAttribute(entity.attributes))
                .map((entity) =>
                    t("validation.detail.weakEntityWithPrimaryKey", {
                        entity: getEntityLabel(entity, t),
                    }),
                );

        case "noWeakEntitiesWithoutPartialKey":
            return getEntities(diagram)
                .filter((entity) => entity.weak)
                .filter((entity) => !hasPartialKeyAttribute(entity.attributes))
                .map((entity) =>
                    t("validation.detail.weakEntityWithoutPartialKey", {
                        entity: getEntityLabel(entity, t),
                    }),
                );

        case "noWeakEntitiesWithMoreThanOnePartialKey":
            return getEntities(diagram)
                .filter((entity) => entity.weak)
                .map((entity) => ({
                    entity,
                    keys: getPartialKeyAttributes(entity.attributes, t),
                }))
                .filter(({ keys }) => keys.length > 1)
                .map(({ entity, keys }) =>
                    t("validation.detail.weakEntityWithMultiplePartialKeys", {
                        entity: getEntityLabel(entity, t),
                        keys: formatQuotedList(keys),
                    }),
                );

        case "noStrongEntitiesWithPartialKey":
            return getEntities(diagram)
                .filter((entity) => !entity.weak)
                .filter((entity) => hasPartialKeyAttribute(entity.attributes))
                .map((entity) =>
                    t("validation.detail.strongEntityWithPartialKey", {
                        entity: getEntityLabel(entity, t),
                    }),
                );

        case "noWeakEntitiesWithoutIdentifyingRelation":
            return getEntities(diagram)
                .filter((entity) => entity.weak)
                .filter((entity) => !entity.identifyingRelationId)
                .map((entity) =>
                    t(
                        "validation.detail.weakEntityWithoutIdentifyingRelation",
                        {
                            entity: getEntityLabel(entity, t),
                        },
                    ),
                );

        case "noUnconnectedRelations":
            return getRelations(diagram)
                .filter((relation) => !isRelationConfigured(relation))
                .map((relation) =>
                    t("validation.detail.unconnectedRelation", {
                        relation: getRelationLabel(relation, t),
                    }),
                );

        case "noAttributesInNonNMRelations":
            return getRelations(diagram)
                .filter((relation) => !canRelationHoldAttributes(relation))
                .filter((relation) => (relation.attributes ?? []).length > 0)
                .map((relation) =>
                    t("validation.detail.nonNmRelationWithAttributes", {
                        relation: getRelationLabel(relation, t),
                    }),
                );

        case "noNMRelationsWithPK":
            return getRelations(diagram)
                .filter((relation) => relation.canHoldAttributes)
                .filter((relation) =>
                    hasPrimaryKeyAttribute(relation.attributes),
                )
                .map((relation) =>
                    t("validation.detail.nmRelationWithPrimaryKey", {
                        relation: getRelationLabel(relation, t),
                    }),
                );

        case "noBrokenRelationEntityReferences":
            return getRelations(diagram)
                .filter((relation) =>
                    getRelationSides(relation).some((side) => {
                        const entityId = side?.entity?.idMx ?? "";

                        return entityId && !getEntityById(diagram, entityId);
                    }),
                )
                .map((relation) =>
                    t("validation.detail.brokenRelationEntityReference", {
                        relation: getRelationLabel(relation, t),
                    }),
                );

        case "noTernaryRelationsWithAmbiguousRepeatedParticipants":
            return getTernaryRepeatedParticipantDetails(diagram, t);

        case "noIdentifyingTernaryRelations":
            return getRelations(diagram)
                .filter(
                    (relation) =>
                        isTernaryRelation(relation) &&
                        relation.isIdentifying === true,
                )
                .map((relation) =>
                    t("validation.detail.identifyingTernaryRelation", {
                        relation: getRelationLabel(relation, t),
                    }),
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
                .map((relation) =>
                    t(
                        "validation.detail.ternaryRelationWithMandatoryCardinality",
                        {
                            relation: getRelationLabel(relation, t),
                        },
                    ),
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
                .map((relation) =>
                    t("validation.detail.relationWithInvalidCardinalities", {
                        relation: getRelationLabel(relation, t),
                    }),
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
                .map(({ index }) =>
                    t("validation.detail.unconnectedIsa", {
                        isa: getIsaLabel(index),
                    }),
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
                .map(({ index }) =>
                    t("validation.detail.brokenIsaEntityReference", {
                        isa: getIsaLabel(index),
                    }),
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
                .map(({ index }) =>
                    t("validation.detail.isaWithRepeatedSpecializations", {
                        isa: getIsaLabel(index),
                    }),
                );

        case "noIsaHierarchiesWithGeneralizationAsSpecialization":
            return getIsas(diagram)
                .map((isa, index) => ({ isa, index }))
                .filter(({ isa }) =>
                    getIsaSpecializationIds(isa).includes(
                        getIsaGeneralizationId(isa),
                    ),
                )
                .map(({ isa, index }) =>
                    t("validation.detail.isaGeneralizationAsSpecialization", {
                        isa: getIsaLabel(index),
                        entity: quote(
                            getEntityNameById(
                                diagram,
                                getIsaGeneralizationId(isa),
                                t,
                            ),
                        ),
                    }),
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
                .map(([entityId]) =>
                    t("validation.detail.specializationInMultipleIsas", {
                        entity: quote(getEntityNameById(diagram, entityId, t)),
                    }),
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
                .map((entity) =>
                    t("validation.detail.isaSpecializationWithPrimaryKey", {
                        entity: getEntityLabel(entity, t),
                    }),
                );
        }

        case "noSQLIdentifierCollisions":
            return [t("validation.detail.sqlIdentifierCollisionHint")];

        default:
            return [];
    }
};

export const getValidationDialogMessages = (
    diagnostics,
    context,
    diagram = null,
    t = translateInDefaultLanguage,
) => {
    if (diagnostics.isValid) {
        const successMessageKey = CONTEXT_SUCCESS_MESSAGE_KEYS[context];

        return successMessageKey ? [t(successMessageKey)] : [];
    }

    const groupedMessages = {
        general: [],
        entities: [],
        relations: [],
        isa: [],
        sql: [],
    };

    VALIDATION_MESSAGE_DEFINITIONS.forEach(({ key, messageKeysByContext }) => {
        if (diagnostics[key] !== false) {
            return;
        }

        const section = DIAGNOSTIC_SECTIONS[key] ?? "general";
        const baseMessageKey =
            messageKeysByContext?.[context] ?? `validation.message.${key}`;
        const detailMessages = getValidationDetailMessages(key, diagram, t);

        groupedMessages[section].push(t(baseMessageKey));
        groupedMessages[section].push(
            ...detailMessages.map((detailMessage) => `- ${detailMessage}`),
        );
    });

    const headerKey = CONTEXT_HEADER_KEYS[context];
    const messages = headerKey ? [t(headerKey)] : [];

    Object.entries(groupedMessages).forEach(([section, sectionMessages]) => {
        if (sectionMessages.length === 0) {
            return;
        }

        messages.push(t(VALIDATION_SECTION_TITLE_KEYS[section]));
        messages.push(...sectionMessages);
    });

    return messages;
};
