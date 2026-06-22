import { RELATION_ARITIES } from '../../src/domain/er/relations'

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

export const createTernarySide = ({
    idMx,
    entity,
    cardinality = '0:N',
    role,
}) => ({
    idMx,
    cardinality,
    ...(role ? { role } : {}),
    entity: { idMx: typeof entity === 'string' ? entity : entity.idMx },
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