import { describe, expect, test } from 'vitest'
import { generateSQL } from '../../../src/utils/sql'

const compactSQL = (sql) => sql.replace(/\s+/g, '')

const expectSQLToContain = (actual, expectedFragment) => {
    expect(compactSQL(actual)).toContain(compactSQL(expectedFragment))
}

const expectSQLNotToContain = (actual, expectedFragment) => {
    expect(compactSQL(actual)).not.toContain(compactSQL(expectedFragment))
}

function createCascadedWeakEntitiesGraph(extraRelations = []) {
    const strongEntity = {
        idMx: 'entity-0',
        name: 'Entidad0',
        weak: false,
        attributes: [
            {
                idMx: 'attr-0',
                name: 'A0',
                key: true,
                partialKey: false,
            },
        ],
    }

    const weakEntity1 = {
        idMx: 'entity-1',
        name: 'Entidad1',
        weak: true,
        ownerEntityId: strongEntity.idMx,
        identifyingRelationId: 'relation-identifying-0',
        attributes: [
            {
                idMx: 'attr-1',
                name: 'A1',
                key: false,
                partialKey: true,
            },
        ],
    }

    const weakEntity2 = {
        idMx: 'entity-2',
        name: 'Entidad2',
        weak: true,
        ownerEntityId: weakEntity1.idMx,
        identifyingRelationId: 'relation-identifying-1',
        attributes: [
            {
                idMx: 'attr-2',
                name: 'A2',
                key: false,
                partialKey: true,
            },
        ],
    }

    const identifyingRelation0 = {
        idMx: 'relation-identifying-0',
        name: 'R0',
        isIdentifying: true,
        attributes: [],
        side1: {
            cardinality: '0:N',
            entity: { idMx: weakEntity1.idMx },
        },
        side2: {
            cardinality: '1:1',
            entity: { idMx: strongEntity.idMx },
        },
    }

    const identifyingRelation1 = {
        idMx: 'relation-identifying-1',
        name: 'R1',
        isIdentifying: true,
        attributes: [],
        side1: {
            cardinality: '0:N',
            entity: { idMx: weakEntity2.idMx },
        },
        side2: {
            cardinality: '1:1',
            entity: { idMx: weakEntity1.idMx },
        },
    }

    return {
        entities: [strongEntity, weakEntity1, weakEntity2],
        relations: [
            identifyingRelation0,
            identifyingRelation1,
            ...extraRelations,
        ],
    }
}

describe('Weak entity SQL generation', () => {
    test('a weak entity should generate a composite primary key with owner key and partial key', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Pedido',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'id_pedido',
                            key: true,
                            partialKey: false,
                        },
                    ],
                },
                {
                    idMx: '3',
                    name: 'LineaPedido',
                    weak: true,
                    ownerEntityId: '1',
                    identifyingRelationId: '4',
                    attributes: [
                        {
                            idMx: '5',
                            name: 'numero_linea',
                            key: false,
                            partialKey: true,
                        },
                        {
                            idMx: '6',
                            name: 'cantidad',
                            key: false,
                            partialKey: false,
                        },
                    ],
                },
            ],
            relations: [
                {
                    idMx: '4',
                    name: 'Identifica',
                    isIdentifying: true,
                    attributes: [],
                    side1: {
                        cardinality: '1:N',
                        entity: { idMx: '3' },
                    },
                    side2: {
                        cardinality: '1:1',
                        entity: { idMx: '1' },
                    },
                },
            ],
        }

        const sql = generateSQL(graph)

        expect(sql).toContain('CREATE TABLE LineaPedido')
        expect(sql).toContain('numero_linea VARCHAR(40)')
        expect(sql).toContain('id_pedido_Pedido VARCHAR(40)')
        expect(sql).toContain('PRIMARY KEY (numero_linea, id_pedido_Pedido)')
        expect(sql).toContain(
            'FOREIGN KEY (id_pedido_Pedido) REFERENCES Pedido(id_pedido)'
        )
        expect(sql).toContain('cantidad VARCHAR(40)')
    })
    
    test('an identifying relation should not generate a standalone table', () => {
        const graph = {
            entities: [
                {
                    idMx: '1',
                    name: 'Pedido',
                    weak: false,
                    attributes: [
                        {
                            idMx: '2',
                            name: 'id_pedido',
                            key: true,
                            partialKey: false,
                        },
                    ],
                },
                {
                    idMx: '3',
                    name: 'LineaPedido',
                    weak: true,
                    ownerEntityId: '1',
                    identifyingRelationId: '4',
                    attributes: [
                        {
                            idMx: '5',
                            name: 'numero_linea',
                            key: false,
                            partialKey: true,
                        },
                    ],
                },
            ],
            relations: [
                {
                    idMx: '4',
                    name: 'Identifica',
                    isIdentifying: true,
                    attributes: [],
                    side1: {
                        cardinality: '1:N',
                        entity: { idMx: '3' },
                    },
                    side2: {
                        cardinality: '1:1',
                        entity: { idMx: '1' },
                    },
                },
            ],
        }

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
            A1 VARCHAR(40) NOT NULL,
            A0_Entidad0 VARCHAR(40) NOT NULL,
            PRIMARY KEY (A1, A0_Entidad0)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad2 (
            A2 VARCHAR(40) NOT NULL,
            A1_Entidad1 VARCHAR(40) NOT NULL,
            A0_Entidad0_Entidad1 VARCHAR(40) NOT NULL,
            PRIMARY KEY (A2, A1_Entidad1, A0_Entidad0_Entidad1)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Entidad2
            ADD CONSTRAINT FK_Entidad2_Entidad1_identifying_owner
            FOREIGN KEY (A1_Entidad1, A0_Entidad0_Entidad1)
            REFERENCES Entidad1(A1, A0_Entidad0);
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
            A2 VARCHAR(40) NOT NULL,
            A1_Entidad1 VARCHAR(40) NOT NULL,
            A0_Entidad0_Entidad1 VARCHAR(40) NOT NULL,
            A2_Reflex_ref VARCHAR(40) NOT NULL,
            A1_Entidad1_Reflex_ref VARCHAR(40) NOT NULL,
            A0_Entidad0_Entidad1_Reflex_ref VARCHAR(40) NOT NULL,
            PRIMARY KEY (A2, A1_Entidad1, A0_Entidad0_Entidad1)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Entidad2
            ADD CONSTRAINT FK_A2_A1_Entidad1_A0_Entidad0_Entidad1_Reflex_ref
            FOREIGN KEY (
            A2_Reflex_ref,
            A1_Entidad1_Reflex_ref,
            A0_Entidad0_Entidad1_Reflex_ref
            )
            REFERENCES Entidad2(A2, A1_Entidad1, A0_Entidad0_Entidad1);
            `,
        )

        expectSQLNotToContain(
            sql,
            `
            CONSTRAINT UQ_A2_A1_Entidad1_A0_Entidad0_Entidad1_Reflex_ref
            UNIQUE (
            A2_Reflex_ref,
            A1_Entidad1_Reflex_ref,
            A0_Entidad0_Entidad1_Reflex_ref
            )
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
            A2 VARCHAR(40) NOT NULL,
            A1_Entidad1 VARCHAR(40) NOT NULL,
            A0_Entidad0_Entidad1 VARCHAR(40) NOT NULL,
            A2_Reflex_ref VARCHAR(40),
            A1_Entidad1_Reflex_ref VARCHAR(40),
            A0_Entidad0_Entidad1_Reflex_ref VARCHAR(40),
            PRIMARY KEY (A2, A1_Entidad1, A0_Entidad0_Entidad1),
            CONSTRAINT UQ_A2_A1_Entidad1_A0_Entidad0_Entidad1_Reflex_ref
            UNIQUE (
                A2_Reflex_ref,
                A1_Entidad1_Reflex_ref,
                A0_Entidad0_Entidad1_Reflex_ref
            )
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Entidad2
            ADD CONSTRAINT FK_A2_A1_Entidad1_A0_Entidad0_Entidad1_Reflex_ref
            FOREIGN KEY (
            A2_Reflex_ref,
            A1_Entidad1_Reflex_ref,
            A0_Entidad0_Entidad1_Reflex_ref
            )
            REFERENCES Entidad2(A2, A1_Entidad1, A0_Entidad0_Entidad1);
            `,
        )
    })

    test('a weak entity reflexive N:M relation should generate two composite foreign keys', () => {
        const reflexiveRelation = {
            idMx: 'relation-reflexive-nm',
            name: 'Reflex',
            isIdentifying: false,
            attributes: [
                {
                    idMx: 'relation-attr-0',
                    name: 'Atributo',
                    key: false,
                    partialKey: false,
                },
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
            )
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Reflex
            ADD CONSTRAINT FK_A2_A1_Entidad1_A0_Entidad0_Entidad1_Reflex_1
            FOREIGN KEY (
            A2_Reflex_1,
            A1_Entidad1_Reflex_1,
            A0_Entidad0_Entidad1_Reflex_1
            )
            REFERENCES Entidad2(A2, A1_Entidad1, A0_Entidad0_Entidad1);
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Reflex
            ADD CONSTRAINT FK_A2_A1_Entidad1_A0_Entidad0_Entidad1_Reflex_2
            FOREIGN KEY (
            A2_Reflex_2,
            A1_Entidad1_Reflex_2,
            A0_Entidad0_Entidad1_Reflex_2
            )
            REFERENCES Entidad2(A2, A1_Entidad1, A0_Entidad0_Entidad1);
            `,
        )
    })    
})