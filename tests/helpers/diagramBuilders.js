import { RELATION_ARITIES } from '../../src/domain/er/relations'

const getEntityReference = (entity) => ({
    idMx: typeof entity === 'string' ? entity : entity.idMx,
})

export const createAttribute = ({
    idMx,
    name,
    key = false,
    partialKey = false,
    children,
    ...rest
}) => ({
    idMx,
    name,
    key,
    partialKey,
    ...(children ? { children } : {}),
    ...rest,
})

export const createStrongEntity = ({ idMx, name, keyName, attributes }) => ({
    idMx,
    name,
    weak: false,
    attributes:
        attributes ??
        (keyName
            ? [
                  createAttribute({
                      idMx: `${idMx}-key`,
                      name: keyName,
                      key: true,
                  }),
              ]
            : []),
})

export const createWeakEntity = ({
    idMx,
    name,
    ownerEntityId,
    identifyingRelationId,
    attributes = [],
}) => ({
    idMx,
    name,
    weak: true,
    ownerEntityId,
    ...(identifyingRelationId ? { identifyingRelationId } : {}),
    attributes,
})

export const createRelationSide = ({
    idMx,
    entity,
    entityId,
    cardinality = '1:1',
    role,
    cell,
    edgeId,
}) => ({
    ...(idMx ? { idMx } : {}),
    cardinality,
    ...(role !== undefined ? { role } : {}),
    ...(cell !== undefined ? { cell } : {}),
    ...(edgeId !== undefined ? { edgeId } : {}),
    entity: getEntityReference(entity ?? entityId),
})

export const createBinaryRelation = ({
    idMx,
    name,
    side1,
    side2,
    attributes = [],
    canHoldAttributes = false,
    isIdentifying = false,
}) => ({
    idMx,
    name,
    canHoldAttributes,
    isIdentifying,
    attributes,
    side1,
    side2,
})

export const createIdentifyingRelation = ({
    idMx,
    name,
    weakEntity,
    ownerEntity,
    weakCardinality = '1:N',
    attributes = [],
}) =>
    createBinaryRelation({
        idMx,
        name,
        isIdentifying: true,
        attributes,
        side1: createRelationSide({
            entity: weakEntity,
            cardinality: weakCardinality,
        }),
        side2: createRelationSide({
            entity: ownerEntity,
            cardinality: '1:1',
        }),
    })

export const createTernarySide = ({
    idMx,
    entity,
    cardinality = '0:N',
    role,
    cell,
    edgeId,
}) =>
    createRelationSide({
        idMx,
        entity,
        cardinality,
        role,
        cell,
        edgeId,
    })

export const createTernaryRelation = ({
    idMx,
    name,
    side1,
    side2,
    side3,
    attributes = [],
    canHoldAttributes = false,
    isIdentifying = false,
}) => ({
    idMx,
    name,
    arity: RELATION_ARITIES.TERNARY,
    canHoldAttributes,
    isIdentifying,
    side1,
    side2,
    side3,
    attributes,
})

export const createIsaHierarchy = ({
    idMx,
    generalization,
    specializations,
}) => ({
    idMx,
    generalization: {
        edgeId: `edge-${getEntityReference(generalization).idMx}`,
        entity: getEntityReference(generalization),
    },
    specializations: specializations.map((specialization) => ({
        edgeId: `edge-${getEntityReference(specialization).idMx}`,
        entity: getEntityReference(specialization),
    })),
})

export const createDiagram = ({ entities = [], relations = [], isas = [] } = {}) => ({
    entities,
    relations,
    isas,
})

export const createTernaryDiagram = ({
    side1Cardinality = '0:N',
    side2Cardinality = '0:N',
    side3Cardinality = '0:N',
} = {}) => {
    const entities = [
        createStrongEntity({
            idMx: 'entity-asignatura',
            name: 'Asignatura',
            keyName: 'id_asignatura',
        }),
        createStrongEntity({
            idMx: 'entity-profesor',
            name: 'Profesor',
            keyName: 'id_profesor',
        }),
        createStrongEntity({
            idMx: 'entity-grupo',
            name: 'Grupo',
            keyName: 'id_grupo',
        }),
    ]

    return createDiagram({
        entities,
        relations: [
            createTernaryRelation({
                idMx: 'relation-imparte',
                name: 'Imparte',
                side1: createTernarySide({
                    idMx: 'side-asignatura',
                    cardinality: side1Cardinality,
                    entity: entities[0],
                }),
                side2: createTernarySide({
                    idMx: 'side-profesor',
                    cardinality: side2Cardinality,
                    entity: entities[1],
                }),
                side3: createTernarySide({
                    idMx: 'side-grupo',
                    cardinality: side3Cardinality,
                    entity: entities[2],
                }),
                attributes: [
                    createAttribute({
                        idMx: 'attr-horas',
                        name: 'horas',
                    }),
                ],
            }),
        ],
    })
}

export const createRepeatedParticipantTernaryDiagram = () => {
    const entities = [
        createStrongEntity({
            idMx: 'entity-tenista',
            name: 'Tenista',
            keyName: 'id_tenista',
        }),
        createStrongEntity({
            idMx: 'entity-fecha',
            name: 'Fecha',
            keyName: 'fecha',
        }),
    ]

    return createDiagram({
        entities,
        relations: [
            createTernaryRelation({
                idMx: 'relation-juega',
                name: 'Juega',
                canHoldAttributes: true,
                side1: createTernarySide({
                    idMx: 'side-tenista-local',
                    cardinality: '0:N',
                    role: 'tenista local',
                    entity: entities[0],
                }),
                side2: createTernarySide({
                    idMx: 'side-tenista-visitante',
                    cardinality: '0:N',
                    role: 'tenista visitante',
                    entity: entities[0],
                }),
                side3: createTernarySide({
                    idMx: 'side-fecha',
                    cardinality: '0:N',
                    role: 'fecha',
                    entity: entities[1],
                }),
            }),
        ],
    })
}

export const createBasicIsaDiagram = () => {
    const entities = [
        createStrongEntity({
            idMx: 'entity-persona',
            name: 'Persona',
            attributes: [
                createAttribute({
                    idMx: 'attr-id-persona',
                    name: 'id_persona',
                    key: true,
                }),
                createAttribute({
                    idMx: 'attr-nombre',
                    name: 'nombre',
                }),
            ],
        }),
        createStrongEntity({
            idMx: 'entity-alumno',
            name: 'Alumno',
            attributes: [
                createAttribute({
                    idMx: 'attr-expediente',
                    name: 'expediente',
                }),
            ],
        }),
        createStrongEntity({
            idMx: 'entity-profesor',
            name: 'Profesor',
            attributes: [
                createAttribute({
                    idMx: 'attr-categoria',
                    name: 'categoria',
                }),
            ],
        }),
    ]

    return createDiagram({
        entities,
        isas: [
            createIsaHierarchy({
                idMx: 'isa-persona',
                generalization: entities[0],
                specializations: [entities[1], entities[2]],
            }),
        ],
    })
}

export const createCompositeIsaDiagram = () => {
    const entities = [
        createStrongEntity({
            idMx: 'entity-documento',
            name: 'Documento',
            attributes: [
                createAttribute({
                    idMx: 'attr-codigo',
                    name: 'codigo',
                    key: true,
                    children: [
                        createAttribute({
                            idMx: 'attr-serie',
                            name: 'serie',
                        }),
                        createAttribute({
                            idMx: 'attr-numero',
                            name: 'numero',
                        }),
                    ],
                }),
                createAttribute({
                    idMx: 'attr-titulo',
                    name: 'titulo',
                }),
            ],
        }),
        createStrongEntity({
            idMx: 'entity-libro',
            name: 'Libro',
            attributes: [
                createAttribute({
                    idMx: 'attr-isbn',
                    name: 'isbn',
                }),
            ],
        }),
    ]

    return createDiagram({
        entities,
        isas: [
            createIsaHierarchy({
                idMx: 'isa-documento',
                generalization: entities[0],
                specializations: [entities[1]],
            }),
        ],
    })
}