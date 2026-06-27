import { normalizeDiagramData } from "./diagramNormalization";
import { RELATION_ARITIES } from "./relations";

export const GENERATE_STRUCTURE_TEMPLATE_IDS = Object.freeze({
    MANY_TO_MANY: "many-to-many",
    ONE_TO_MANY: "one-to-many",
    ONE_TO_ONE: "one-to-one",
    TERNARY: "ternary",
    WEAK_ENTITY: "weak-entity",
    ISA: "isa",
});

const createAttribute = ({
    idMx,
    name = "Atributo",
    position,
    key = false,
    partialKey = false,
    multivalued = false,
    offsetX = 0,
    offsetY = 0,
    children,
}) => ({
    idMx,
    name,
    position,
    key,
    partialKey,
    ...(multivalued ? { multivalued: true } : {}),
    cell: [idMx, `${idMx}-edge`],
    offsetX,
    offsetY,
    ...(children ? { children } : {}),
});

const createStrongEntity = ({ idMx, name, position, attributes }) => ({
    idMx,
    name,
    position,
    weak: false,
    ownerEntityId: null,
    identifyingRelationId: null,
    attributes,
});

const createWeakEntity = ({
    idMx,
    name,
    position,
    ownerEntityId,
    identifyingRelationId,
    attributes,
}) => ({
    idMx,
    name,
    position,
    weak: true,
    ownerEntityId,
    identifyingRelationId,
    attributes,
});

const createDefaultStrongEntity = ({
    idMx,
    name,
    position,
    attributePrefix,
    includeSecondAttribute = true,
}) =>
    createStrongEntity({
        idMx,
        name,
        position,
        attributes: [
            createAttribute({
                idMx: `${attributePrefix}-attribute-1`,
                name: "id",
                position: {
                    x: position.x - 25,
                    y: position.y - 80,
                },
                key: true,
                offsetX: -25,
                offsetY: -80,
            }),
            ...(includeSecondAttribute
                ? [
                      createAttribute({
                          idMx: `${attributePrefix}-attribute-2`,
                          name: "Atributo 1",
                          position: {
                              x: position.x - 25,
                              y: position.y + 95,
                          },
                          offsetX: -25,
                          offsetY: 95,
                      }),
                  ]
                : []),
        ],
    });

const createDefaultWeakEntity = ({
    idMx,
    name,
    position,
    ownerEntityId,
    identifyingRelationId,
    attributePrefix,
}) =>
    createWeakEntity({
        idMx,
        name,
        position,
        ownerEntityId,
        identifyingRelationId,
        attributes: [
            createAttribute({
                idMx: `${attributePrefix}-attribute-1`,
                name: "discriminante",
                position: {
                    x: position.x - 25,
                    y: position.y - 80,
                },
                partialKey: true,
                offsetX: -25,
                offsetY: -80,
            }),
            createAttribute({
                idMx: `${attributePrefix}-attribute-2`,
                name: "Atributo 1",
                position: {
                    x: position.x - 25,
                    y: position.y + 95,
                },
                offsetX: -25,
                offsetY: 95,
            }),
        ],
    });

const createRelationSide = ({
    relationId,
    sideKey,
    entityId,
    cardinality,
}) => ({
    idMx: `${relationId}-${sideKey}-cardinality`,
    cardinality,
    role: "",
    cell: `${relationId}-${sideKey}-cardinality`,
    edgeId: `${relationId}-${sideKey}-edge`,
    entity: { idMx: entityId },
});

const createRelationAttribute = ({ relationId, position }) =>
    createAttribute({
        idMx: `${relationId}-attribute-1`,
        position: {
            x: position.x,
            y: position.y + 115,
        },
        offsetX: 0,
        offsetY: 115,
    });

const createBinaryRelation = ({
    idMx,
    name = "Relación",
    position,
    side1EntityId,
    side1Cardinality,
    side2EntityId,
    side2Cardinality,
    canHoldAttributes = false,
    isIdentifying = false,
    attributes = [],
}) => ({
    idMx,
    name,
    position,
    side1: createRelationSide({
        relationId: idMx,
        sideKey: "side1",
        entityId: side1EntityId,
        cardinality: side1Cardinality,
    }),
    side2: createRelationSide({
        relationId: idMx,
        sideKey: "side2",
        entityId: side2EntityId,
        cardinality: side2Cardinality,
    }),
    canHoldAttributes,
    isIdentifying,
    attributes,
});

const createManyToManyStructure = () => {
    const relationPosition = { x: 370, y: 200 };

    return normalizeDiagramData({
        entities: [
            createDefaultStrongEntity({
                idMx: "template-nm-entity-1",
                name: "Entidad",
                position: { x: 130, y: 180 },
                attributePrefix: "template-nm-entity-1",
            }),
            createDefaultStrongEntity({
                idMx: "template-nm-entity-2",
                name: "Entidad 1",
                position: { x: 590, y: 180 },
                attributePrefix: "template-nm-entity-2",
            }),
        ],
        relations: [
            createBinaryRelation({
                idMx: "template-nm-relation-1",
                position: relationPosition,
                side1EntityId: "template-nm-entity-1",
                side1Cardinality: "0:N",
                side2EntityId: "template-nm-entity-2",
                side2Cardinality: "0:N",
                canHoldAttributes: true,
                attributes: [
                    createRelationAttribute({
                        relationId: "template-nm-relation-1",
                        position: relationPosition,
                    }),
                ],
            }),
        ],
        isas: [],
    });
};

const createOneToManyStructure = () =>
    normalizeDiagramData({
        entities: [
            createDefaultStrongEntity({
                idMx: "template-1n-entity-1",
                name: "Entidad",
                position: { x: 130, y: 180 },
                attributePrefix: "template-1n-entity-1",
            }),
            createDefaultStrongEntity({
                idMx: "template-1n-entity-2",
                name: "Entidad 1",
                position: { x: 590, y: 180 },
                attributePrefix: "template-1n-entity-2",
            }),
        ],
        relations: [
            createBinaryRelation({
                idMx: "template-1n-relation-1",
                position: { x: 370, y: 200 },
                side1EntityId: "template-1n-entity-1",
                side1Cardinality: "1:1",
                side2EntityId: "template-1n-entity-2",
                side2Cardinality: "0:N",
            }),
        ],
        isas: [],
    });

const createOneToOneStructure = () =>
    normalizeDiagramData({
        entities: [
            createDefaultStrongEntity({
                idMx: "template-11-entity-1",
                name: "Entidad",
                position: { x: 130, y: 180 },
                attributePrefix: "template-11-entity-1",
            }),
            createDefaultStrongEntity({
                idMx: "template-11-entity-2",
                name: "Entidad 1",
                position: { x: 590, y: 180 },
                attributePrefix: "template-11-entity-2",
            }),
        ],
        relations: [
            createBinaryRelation({
                idMx: "template-11-relation-1",
                position: { x: 370, y: 200 },
                side1EntityId: "template-11-entity-1",
                side1Cardinality: "0:1",
                side2EntityId: "template-11-entity-2",
                side2Cardinality: "0:1",
            }),
        ],
        isas: [],
    });

const createTernaryStructure = () => {
    const relationPosition = { x: 370, y: 250 };

    return normalizeDiagramData({
        entities: [
            createDefaultStrongEntity({
                idMx: "template-ternary-entity-1",
                name: "Entidad",
                position: { x: 100, y: 110 },
                attributePrefix: "template-ternary-entity-1",
                includeSecondAttribute: false,
            }),
            createDefaultStrongEntity({
                idMx: "template-ternary-entity-2",
                name: "Entidad 1",
                position: { x: 610, y: 110 },
                attributePrefix: "template-ternary-entity-2",
                includeSecondAttribute: false,
            }),
            createDefaultStrongEntity({
                idMx: "template-ternary-entity-3",
                name: "Entidad 2",
                position: { x: 355, y: 430 },
                attributePrefix: "template-ternary-entity-3",
                includeSecondAttribute: false,
            }),
        ],
        relations: [
            {
                idMx: "template-ternary-relation-1",
                name: "Relación",
                position: relationPosition,
                arity: RELATION_ARITIES.TERNARY,
                side1: createRelationSide({
                    relationId: "template-ternary-relation-1",
                    sideKey: "side1",
                    entityId: "template-ternary-entity-1",
                    cardinality: "0:N",
                }),
                side2: createRelationSide({
                    relationId: "template-ternary-relation-1",
                    sideKey: "side2",
                    entityId: "template-ternary-entity-2",
                    cardinality: "0:N",
                }),
                side3: createRelationSide({
                    relationId: "template-ternary-relation-1",
                    sideKey: "side3",
                    entityId: "template-ternary-entity-3",
                    cardinality: "0:N",
                }),
                canHoldAttributes: true,
                isIdentifying: false,
                attributes: [
                    createRelationAttribute({
                        relationId: "template-ternary-relation-1",
                        position: relationPosition,
                    }),
                ],
            },
        ],
        isas: [],
    });
};

const createWeakEntityStructure = () =>
    normalizeDiagramData({
        entities: [
            createDefaultStrongEntity({
                idMx: "template-weak-entity-1",
                name: "Entidad",
                position: { x: 130, y: 180 },
                attributePrefix: "template-weak-entity-1",
            }),
            createDefaultWeakEntity({
                idMx: "template-weak-entity-2",
                name: "Entidad 1",
                position: { x: 590, y: 180 },
                ownerEntityId: "template-weak-entity-1",
                identifyingRelationId: "template-weak-relation-1",
                attributePrefix: "template-weak-entity-2",
            }),
        ],
        relations: [
            createBinaryRelation({
                idMx: "template-weak-relation-1",
                position: { x: 370, y: 200 },
                side1EntityId: "template-weak-entity-1",
                side1Cardinality: "1:1",
                side2EntityId: "template-weak-entity-2",
                side2Cardinality: "0:N",
                isIdentifying: true,
            }),
        ],
        isas: [],
    });

const createIsaStructure = () =>
    normalizeDiagramData({
        entities: [
            createDefaultStrongEntity({
                idMx: "template-isa-entity-1",
                name: "Entidad",
                position: { x: 360, y: 80 },
                attributePrefix: "template-isa-entity-1",
            }),
            createStrongEntity({
                idMx: "template-isa-entity-2",
                name: "Entidad 1",
                position: { x: 150, y: 360 },
                attributes: [
                    createAttribute({
                        idMx: "template-isa-entity-2-attribute-1",
                        position: { x: 125, y: 475 },
                        offsetX: -25,
                        offsetY: 115,
                    }),
                ],
            }),
            createStrongEntity({
                idMx: "template-isa-entity-3",
                name: "Entidad 2",
                position: { x: 585, y: 360 },
                attributes: [
                    createAttribute({
                        idMx: "template-isa-entity-3-attribute-1",
                        position: { x: 560, y: 475 },
                        offsetX: -25,
                        offsetY: 115,
                    }),
                ],
            }),
        ],
        relations: [],
        isas: [
            {
                idMx: "template-isa-1",
                position: { x: 380, y: 250 },
                generalization: {
                    edgeId: "template-isa-1-generalization-edge",
                    entity: { idMx: "template-isa-entity-1" },
                },
                specializations: [
                    {
                        edgeId: "template-isa-1-specialization-1-edge",
                        entity: { idMx: "template-isa-entity-2" },
                    },
                    {
                        edgeId: "template-isa-1-specialization-2-edge",
                        entity: { idMx: "template-isa-entity-3" },
                    },
                ],
            },
        ],
    });

export const GENERATE_STRUCTURE_TEMPLATES = [
    {
        id: GENERATE_STRUCTURE_TEMPLATE_IDS.MANY_TO_MANY,
        name: "Relación N:M básica",
        description:
            "Crea dos entidades con atributos, una relación N:M entre ellas y un atributo propio de la relación.",
        createDiagram: createManyToManyStructure,
    },
    {
        id: GENERATE_STRUCTURE_TEMPLATE_IDS.ONE_TO_MANY,
        name: "Relación 1:N básica",
        description:
            "Crea dos entidades con atributos y una relación 1:N entre ellas.",
        createDiagram: createOneToManyStructure,
    },
    {
        id: GENERATE_STRUCTURE_TEMPLATE_IDS.ONE_TO_ONE,
        name: "Relación 1:1 básica",
        description:
            "Crea dos entidades con atributos y una relación 1:1 entre ellas.",
        createDiagram: createOneToOneStructure,
    },
    {
        id: GENERATE_STRUCTURE_TEMPLATE_IDS.TERNARY,
        name: "Relación ternaria básica",
        description:
            "Crea tres entidades con clave primaria y una relación ternaria N:M:P con atributo propio.",
        createDiagram: createTernaryStructure,
    },
    {
        id: GENERATE_STRUCTURE_TEMPLATE_IDS.WEAK_ENTITY,
        name: "Entidad débil básica",
        description:
            "Crea una entidad fuerte, una entidad débil con discriminante y una relación identificadora.",
        createDiagram: createWeakEntityStructure,
    },
    {
        id: GENERATE_STRUCTURE_TEMPLATE_IDS.ISA,
        name: "ISA básica",
        description:
            "Crea una generalización, dos especializaciones y una jerarquía ISA válida.",
        createDiagram: createIsaStructure,
    },
];

export const getGenerateStructureTemplateById = (templateId) =>
    GENERATE_STRUCTURE_TEMPLATES.find(
        (template) => template.id === templateId,
    ) ?? GENERATE_STRUCTURE_TEMPLATES[0];

export const createExampleDiagramStructure = () =>
    getGenerateStructureTemplateById(
        GENERATE_STRUCTURE_TEMPLATE_IDS.MANY_TO_MANY,
    ).createDiagram();
