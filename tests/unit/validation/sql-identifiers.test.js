import { beforeEach, describe, expect, test } from 'vitest'
import {
    createAttribute,
    createDiagram,
    createIdentifyingRelation,
    createStrongEntity,
    createWeakEntity,
} from '../../helpers/diagramBuilders'
import { loadGraphFixture } from '../../helpers/graphLoader'
import {
    sqlIdentifierCollisions,
    validateGraph,
} from '../../../src/domain/er/validation'

let graph

const createKeyAttribute = ({ idMx = 'attr-id', name = 'id', ...rest } = {}) =>
    createAttribute({
        idMx,
        name,
        key: true,
        ...rest,
    })

const createRegularAttribute = ({ idMx, name, ...rest }) =>
    createAttribute({
        idMx,
        name,
        ...rest,
    })

const createMultivaluedAttribute = ({ idMx, name, children, ...rest }) =>
    createRegularAttribute({
        idMx,
        name,
        multivalued: true,
        ...(children ? { children } : {}),
        ...rest,
    })

const replaceFirstEntityAttributes = ({ name = 'Cliente', attributes }) => {
    graph.entities.at(0).name = name
    graph.entities.at(0).attributes = attributes
}

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe('SQL identifier normalization', () => {
    test('Attributes normalized for SQL should not collide', () => {
        expect(sqlIdentifierCollisions(graph)).toBe(false)

        graph.entities.at(0).attributes.at(0).name = 'código'
        graph.entities.at(0).attributes.at(1).name = 'codigo'

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })

    test('Normalized SQL identifiers should not collide', () => {
        expect(sqlIdentifierCollisions(graph)).toBe(false)

        graph.entities.at(0).name = 'País'
        graph.entities.at(1).name = 'Pais'

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })

    test('Composite attribute projections that normalize to the same SQL column should be invalid', () => {
        graph.entities.at(0).attributes = [
            createRegularAttribute({
                idMx: 'attr-1',
                name: 'direccion',
                children: [
                    createRegularAttribute({
                        idMx: 'attr-2',
                        name: 'código',
                    }),
                ],
            }),
            createKeyAttribute({
                idMx: 'attr-3',
                name: 'codigo',
            }),
        ]

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })
})

describe('Multivalued auxiliary table names', () => {
    test('Multivalued auxiliary table names should not collide with entity table names', () => {
        replaceFirstEntityAttributes({
            attributes: [
                createKeyAttribute({
                    idMx: 'attr-id-cliente',
                    name: 'id_cliente',
                }),
                createMultivaluedAttribute({
                    idMx: 'attr-telefono',
                    name: 'telefono',
                }),
            ],
        })

        graph.entities.push(
            createStrongEntity({
                idMx: 'entity-cliente-telefono',
                name: 'Cliente_telefono',
                attributes: [
                    createKeyAttribute({
                        idMx: 'attr-id-tabla',
                        name: 'id',
                    }),
                ],
            }),
        )

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })

    test('Multivalued auxiliary table names should not collide with other auxiliary table names', () => {
        replaceFirstEntityAttributes({
            attributes: [
                createKeyAttribute({
                    idMx: 'attr-id-cliente',
                    name: 'id_cliente',
                }),
                createMultivaluedAttribute({
                    idMx: 'attr-telefono-movil',
                    name: 'telefono_movil',
                }),
            ],
        })

        graph.entities.push(
            createStrongEntity({
                idMx: 'entity-cliente-telefono',
                name: 'Cliente_telefono',
                attributes: [
                    createKeyAttribute({
                        idMx: 'attr-id-cliente-telefono',
                        name: 'id_cliente_telefono',
                    }),
                    createMultivaluedAttribute({
                        idMx: 'attr-movil',
                        name: 'movil',
                    }),
                ],
            }),
        )

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })
})

describe('Multivalued auxiliary table columns', () => {
    test('Multivalued auxiliary table columns should not collide with composite owner key columns', () => {
        const diagram = createDiagram({
            entities: [
                createStrongEntity({
                    idMx: 'entity-documento',
                    name: 'Documento',
                    attributes: [
                        createKeyAttribute({
                            idMx: 'attr-codigo',
                            name: 'codigo',
                            children: [
                                createRegularAttribute({
                                    idMx: 'attr-serie',
                                    name: 'serie',
                                }),
                                createRegularAttribute({
                                    idMx: 'attr-numero',
                                    name: 'numero',
                                }),
                            ],
                        }),
                        createMultivaluedAttribute({
                            idMx: 'attr-codigo-numero',
                            name: 'numero',
                        }),
                    ],
                }),
            ],
        })

        expect(sqlIdentifierCollisions(diagram)).toBe(true)
        expect(validateGraph(diagram).noSQLIdentifierCollisions).toBe(false)
    })

    test('Multivalued auxiliary table columns should not collide with weak owner key columns', () => {
        const ownerEntity = createStrongEntity({
            idMx: 'entity-pedido',
            name: 'Pedido',
            attributes: [
                createKeyAttribute({
                    idMx: 'attr-id-pedido',
                    name: 'id_pedido',
                }),
            ],
        })

        const weakEntity = createWeakEntity({
            idMx: 'entity-linea-pedido',
            name: 'LineaPedido',
            ownerEntityId: ownerEntity.idMx,
            identifyingRelationId: 'relation-identifica',
            attributes: [
                createRegularAttribute({
                    idMx: 'attr-numero-linea',
                    name: 'numero_linea',
                    partialKey: true,
                }),
                createMultivaluedAttribute({
                    idMx: 'attr-id-pedido-pedido',
                    name: 'id_pedido_Pedido',
                }),
            ],
        })

        const diagram = createDiagram({
            entities: [ownerEntity, weakEntity],
            relations: [
                createIdentifyingRelation({
                    idMx: 'relation-identifica',
                    name: 'Identifica',
                    weakEntity,
                    ownerEntity,
                    weakCardinality: '1:N',
                }),
            ],
        })

        expect(sqlIdentifierCollisions(diagram)).toBe(true)
        expect(validateGraph(diagram).noSQLIdentifierCollisions).toBe(false)
    })

    test('Composite multivalued auxiliary table leaf columns should not collide after SQL normalization', () => {
        replaceFirstEntityAttributes({
            attributes: [
                createKeyAttribute({
                    idMx: 'attr-id-cliente',
                    name: 'id_cliente',
                }),
                createMultivaluedAttribute({
                    idMx: 'attr-contacto',
                    name: 'contacto',
                    children: [
                        createRegularAttribute({
                            idMx: 'attr-codigo-accent',
                            name: 'código',
                        }),
                        createRegularAttribute({
                            idMx: 'attr-codigo',
                            name: 'codigo',
                        }),
                    ],
                }),
            ],
        })

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })

    test('Composite multivalued auxiliary table leaf columns should not collide with owner key columns', () => {
        replaceFirstEntityAttributes({
            attributes: [
                createKeyAttribute({
                    idMx: 'attr-id-cliente',
                    name: 'id_cliente',
                }),
                createMultivaluedAttribute({
                    idMx: 'attr-id',
                    name: 'id',
                    children: [
                        createRegularAttribute({
                            idMx: 'attr-cliente',
                            name: 'id_cliente',
                        }),
                    ],
                }),
            ],
        })

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })
})