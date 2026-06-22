import { describe, expect, test } from 'vitest'
import {
    createAttribute,
    createDiagram,
    createStrongEntity,
    createWeakEntity,
} from '../../helpers/diagramBuilders'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import { generateSQL } from '../../../src/services/sql'

const { expectSQLToContain, expectSQLNotToContain } =
    buildSQLAssertions(expect)

const getEntityId = (entity) =>
    typeof entity === 'string' ? entity : entity.idMx

const createIdentifyingRelation = ({
    idMx,
    name,
    weakEntity,
    ownerEntity,
    weakCardinality = '1:N',
}) => ({
    idMx,
    name,
    isIdentifying: true,
    attributes: [],
    side1: {
        cardinality: weakCardinality,
        entity: { idMx: getEntityId(weakEntity) },
    },
    side2: {
        cardinality: '1:1',
        entity: { idMx: getEntityId(ownerEntity) },
    },
})

function createPedidoLineaPedidoGraph(lineaPedidoAttributes = []) {
    const pedido = createStrongEntity({
        idMx: '1',
        name: 'Pedido',
        keyName: 'id_pedido',
    })

    const lineaPedido = createWeakEntity({
        idMx: '3',
        name: 'LineaPedido',
        ownerEntityId: pedido.idMx,
        identifyingRelationId: '4',
        attributes: lineaPedidoAttributes,
    })

    return createDiagram({
        entities: [pedido, lineaPedido],
        relations: [
            createIdentifyingRelation({
                idMx: '4',
                name: 'Identifica',
                weakEntity: lineaPedido,
                ownerEntity: pedido,
            }),
        ],
    })
}

function createCascadedWeakEntitiesGraph(extraRelations = []) {
    const strongEntity = createStrongEntity({
        idMx: 'entity-0',
        name: 'Entidad0',
        attributes: [
            createAttribute({
                idMx: 'attr-0',
                name: 'A0',
                key: true,
            }),
        ],
    })

    const weakEntity1 = createWeakEntity({
        idMx: 'entity-1',
        name: 'Entidad1',
        ownerEntityId: strongEntity.idMx,
        identifyingRelationId: 'relation-identifying-0',
        attributes: [
            createAttribute({
                idMx: 'attr-1',
                name: 'A1',
                partialKey: true,
            }),
        ],
    })

    const weakEntity2 = createWeakEntity({
        idMx: 'entity-2',
        name: 'Entidad2',
        ownerEntityId: weakEntity1.idMx,
        identifyingRelationId: 'relation-identifying-1',
        attributes: [
            createAttribute({
                idMx: 'attr-2',
                name: 'A2',
                partialKey: true,
            }),
        ],
    })

    return createDiagram({
        entities: [strongEntity, weakEntity1, weakEntity2],
        relations: [
            createIdentifyingRelation({
                idMx: 'relation-identifying-0',
                name: 'R0',
                weakEntity: weakEntity1,
                ownerEntity: strongEntity,
                weakCardinality: '0:N',
            }),
            createIdentifyingRelation({
                idMx: 'relation-identifying-1',
                name: 'R1',
                weakEntity: weakEntity2,
                ownerEntity: weakEntity1,
                weakCardinality: '0:N',
            }),
            ...extraRelations,
        ],
    })
}

describe('Weak entity SQL generation', () => {
    test('a weak entity should generate a composite primary key with owner key and partial key', () => {
        const graph = createPedidoLineaPedidoGraph([
            createAttribute({
                idMx: '5',
                name: 'numero_linea',
                partialKey: true,
            }),
            createAttribute({
                idMx: '6',
                name: 'cantidad',
            })
        ])

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE LineaPedido')
        expect(sql).toContain('numero_linea VARCHAR(40)')
        expect(sql).toContain('id_pedido_Pedido VARCHAR(40)')
        expect(sql).toContain('PRIMARY KEY (numero_linea, id_pedido_Pedido)')
        expectSQLToContain(
            sql,
            `
            id_pedido_Pedido VARCHAR(40) REFERENCES Pedido ON DELETE CASCADE ON UPDATE CASCADE
            `,
        )
        expect(sql).toContain('cantidad VARCHAR(40)')
    })

    test('a weak entity should generate a separate table for a simple multivalued attribute', () => {
        const graph = createPedidoLineaPedidoGraph([
            createAttribute({
                idMx: '5',
                name: 'numero_linea',
                partialKey: true,
            }),
            createAttribute({
                idMx: '6',
                name: 'cantidad',
            }),
            createAttribute({
                idMx: '7',
                name: 'etiqueta',
                multivalued: true,
            })
        ])

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE LineaPedido (
            numero_linea VARCHAR(40),
            cantidad VARCHAR(40),
            id_pedido_Pedido VARCHAR(40) REFERENCES Pedido ON DELETE CASCADE ON UPDATE CASCADE,
            PRIMARY KEY (numero_linea, id_pedido_Pedido)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE LineaPedido_etiqueta (
            numero_linea VARCHAR(40),
            id_pedido_Pedido VARCHAR(40),
            etiqueta VARCHAR(40),
            PRIMARY KEY (numero_linea, id_pedido_Pedido, etiqueta),
            FOREIGN KEY (numero_linea, id_pedido_Pedido) 
            REFERENCES LineaPedido 
            ON DELETE CASCADE 
            ON UPDATE CASCADE
            );
            `,
        )
    })    
    
    test('an identifying relation should not generate a standalone table', () => {
        const graph = createPedidoLineaPedidoGraph([
            createAttribute({
                idMx: '5',
                name: 'numero_linea',
                partialKey: true,
            })
        ])

        const sql = generateSQL(graph)

        expect(sql).not.toContain('CREATE TABLE Identifica')
    })

    test('a cascaded weak entity should inherit the full owner primary key', () => {
        const graph = createCascadedWeakEntitiesGraph()

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad1 (
            A1 VARCHAR(40),
            A0_Entidad0 VARCHAR(40) REFERENCES Entidad0 ON DELETE CASCADE ON UPDATE CASCADE,
            PRIMARY KEY (A1, A0_Entidad0)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad2 (
            A2 VARCHAR(40),
            A1_Entidad1 VARCHAR(40),
            A0_Entidad0_Entidad1 VARCHAR(40),
            PRIMARY KEY (A2, A1_Entidad1, A0_Entidad0_Entidad1),
            FOREIGN KEY (A1_Entidad1, A0_Entidad0_Entidad1) REFERENCES Entidad1 ON DELETE CASCADE ON UPDATE CASCADE
            );
            `,
        )      
    })

    test('a weak entity reflexive 1:N relation should generate a composite self-referencing foreign key', () => {
        const reflexiveRelation = {
            idMx: 'relation-reflexive-1n',
            name: 'Reflex',
            isIdentifying: false,
            attributes: [],
            side1: {
                cardinality: '1:1',
                entity: { idMx: 'entity-2' },
            },
            side2: {
                cardinality: '0:N',
                entity: { idMx: 'entity-2' },
            },
        }

        const graph = createCascadedWeakEntitiesGraph([reflexiveRelation])

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad2 (
            A2 VARCHAR(40),
            A1_Entidad1 VARCHAR(40),
            A0_Entidad0_Entidad1 VARCHAR(40),
            A2_Reflex_ref VARCHAR(40) NOT NULL,
            A1_Entidad1_Reflex_ref VARCHAR(40) NOT NULL,
            A0_Entidad0_Entidad1_Reflex_ref VARCHAR(40) NOT NULL,
            PRIMARY KEY (A2, A1_Entidad1, A0_Entidad0_Entidad1),
            FOREIGN KEY (A1_Entidad1, A0_Entidad0_Entidad1) REFERENCES Entidad1 ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (A2_Reflex_ref, A1_Entidad1_Reflex_ref, A0_Entidad0_Entidad1_Reflex_ref) REFERENCES Entidad2
            );
            `,
        )
    })

    test('a weak entity reflexive 1:1 relation should generate a composite unique self-reference', () => {
        const reflexiveRelation = {
            idMx: 'relation-reflexive-11',
            name: 'Reflex',
            isIdentifying: false,
            attributes: [],
            side1: {
                cardinality: '0:1',
                entity: { idMx: 'entity-2' },
            },
            side2: {
                cardinality: '0:1',
                entity: { idMx: 'entity-2' },
            },
        }

        const graph = createCascadedWeakEntitiesGraph([reflexiveRelation])

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad2 (
            A2 VARCHAR(40),
            A1_Entidad1 VARCHAR(40),
            A0_Entidad0_Entidad1 VARCHAR(40),
            A2_Reflex_ref VARCHAR(40),
            A1_Entidad1_Reflex_ref VARCHAR(40),
            A0_Entidad0_Entidad1_Reflex_ref VARCHAR(40),
            PRIMARY KEY (A2, A1_Entidad1, A0_Entidad0_Entidad1),
            CONSTRAINT UQ_A2_A1_Entidad1_A0_Entidad0_Entidad1_Reflex_ref
            UNIQUE (
                A2_Reflex_ref,
                A1_Entidad1_Reflex_ref,
                A0_Entidad0_Entidad1_Reflex_ref
            ),
            FOREIGN KEY (A1_Entidad1, A0_Entidad0_Entidad1) REFERENCES Entidad1 ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (A2_Reflex_ref, A1_Entidad1_Reflex_ref, A0_Entidad0_Entidad1_Reflex_ref) REFERENCES Entidad2            `,
        )
    })

    test('a weak entity reflexive N:M relation should generate two composite foreign keys', () => {
        const reflexiveRelation = {
            idMx: 'relation-reflexive-nm',
            name: 'Reflex',
            isIdentifying: false,
            attributes: [
                createAttribute({
                    idMx: 'relation-attr-0',
                    name: 'Atributo',
                }),
            ],
            side1: {
                cardinality: '0:N',
                entity: { idMx: 'entity-2' },
            },
            side2: {
                cardinality: '0:N',
                entity: { idMx: 'entity-2' },
            },
        }

        const graph = createCascadedWeakEntitiesGraph([reflexiveRelation])

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Reflex (
            A2_Reflex_1 VARCHAR(40),
            A1_Entidad1_Reflex_1 VARCHAR(40),
            A0_Entidad0_Entidad1_Reflex_1 VARCHAR(40),
            A2_Reflex_2 VARCHAR(40),
            A1_Entidad1_Reflex_2 VARCHAR(40),
            A0_Entidad0_Entidad1_Reflex_2 VARCHAR(40),
            Atributo VARCHAR(40),
            PRIMARY KEY (
                A2_Reflex_1,
                A1_Entidad1_Reflex_1,
                A0_Entidad0_Entidad1_Reflex_1,
                A2_Reflex_2,
                A1_Entidad1_Reflex_2,
                A0_Entidad0_Entidad1_Reflex_2
            ),
            FOREIGN KEY (A2_Reflex_1, A1_Entidad1_Reflex_1, A0_Entidad0_Entidad1_Reflex_1) REFERENCES Entidad2,
            FOREIGN KEY (A2_Reflex_2, A1_Entidad1_Reflex_2, A0_Entidad0_Entidad1_Reflex_2) REFERENCES Entidad2
            );
            `,
        )       
    })

    test('a weak entity should project a composite partial key to leaf columns', () => {
        const graph = createPedidoLineaPedidoGraph([
            createAttribute({
                idMx: '5',
                name: 'codigo',
                partialKey: true,
                children: [
                    createAttribute({
                        idMx: '6',
                        name: 'serie',
                    }),
                    createAttribute({
                        idMx: '7',
                        name: 'numero',
                    }),
                ],
            }),
            createAttribute({
                idMx: '8',
                name: 'cantidad',
            })
        ])

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE LineaPedido')
        expect(sql).toContain('serie VARCHAR(40)')
        expect(sql).toContain('numero VARCHAR(40)')
        expect(sql).toContain('id_pedido_Pedido VARCHAR(40)')
        expect(sql).toContain(
            'PRIMARY KEY (serie, numero, id_pedido_Pedido)',
        )
        expect(sql).not.toContain('codigo VARCHAR(40)')
    })
    
    test('a weak entity should generate a separate table for a composite multivalued attribute', () => {
        const graph = createPedidoLineaPedidoGraph([
            createAttribute({
                idMx: '5',
                name: 'numero_linea',
                partialKey: true,
            }),
            createAttribute({
                idMx: '6',
                name: 'cantidad',
            }),
            createAttribute({
                idMx:'7',
                name: 'contacto',
                multivalued: true,
                children: [
                    createAttribute({
                        idMx: '8',
                        name: 'prefijo',
                    }),
                    createAttribute({
                        idMx: '9',
                        name: 'numero',
                    })
                ]
            })
        ])

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE LineaPedido (
            numero_linea VARCHAR(40),
            cantidad VARCHAR(40),
            id_pedido_Pedido VARCHAR(40) REFERENCES Pedido ON DELETE CASCADE ON UPDATE CASCADE,
            PRIMARY KEY (numero_linea, id_pedido_Pedido)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE LineaPedido_contacto (
            numero_linea VARCHAR(40),
            id_pedido_Pedido VARCHAR(40),
            prefijo VARCHAR(40),
            numero VARCHAR(40),
            PRIMARY KEY (numero_linea, id_pedido_Pedido, prefijo, numero),
            FOREIGN KEY (numero_linea, id_pedido_Pedido) REFERENCES LineaPedido ON DELETE CASCADE ON UPDATE CASCADE
            );
            `,
        )

        expect(sql).not.toContain('contacto VARCHAR(40)')
    })
})