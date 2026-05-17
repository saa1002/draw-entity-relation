import { describe, expect, test } from 'vitest'
import { RELATION_ARITIES } from '../../../src/domain/er/relations'
import { generateSQL } from '../../../src/services/sql'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'

const { expectSQLToContain } = buildSQLAssertions(expect)

const createEntity = ({ idMx, name, keyName }) => ({
    idMx,
    name,
    weak: false,
    attributes: [
        {
            idMx: `${idMx}-key`,
            name: keyName,
            key: true,
            partialKey: false,
        },
    ],
})

const createTernaryGraph = ({
    side1Cardinality = '0:N',
    side2Cardinality = '0:N',
    side3Cardinality = '0:N',
} = {}) => {
    const entities = [
        createEntity({
            idMx: 'entity-asignatura',
            name: 'Asignatura',
            keyName: 'id_asignatura',
        }),
        createEntity({
            idMx: 'entity-profesor',
            name: 'Profesor',
            keyName: 'id_profesor',
        }),
        createEntity({
            idMx: 'entity-grupo',
            name: 'Grupo',
            keyName: 'id_grupo',
        }),
    ]

    return {
        entities,
        relations: [
            {
                idMx: 'relation-imparte',
                name: 'Imparte',
                arity: RELATION_ARITIES.TERNARY,
                canHoldAttributes: false,
                isIdentifying: false,
                side1: {
                    idMx: 'side-asignatura',
                    cardinality: side1Cardinality,
                    entity: { idMx: entities[0].idMx },
                },
                side2: {
                    idMx: 'side-profesor',
                    cardinality: side2Cardinality,
                    entity: { idMx: entities[1].idMx },
                },
                side3: {
                    idMx: 'side-grupo',
                    cardinality: side3Cardinality,
                    entity: { idMx: entities[2].idMx },
                },
                attributes: [
                    {
                        idMx: 'attr-horas',
                        name: 'horas',
                        key: false,
                        partialKey: false,
                    },
                ],
            },
        ],
    }
}

describe('Ternary relationship SQL generation', () => {
    test('should generate a ternary relation table with a three-column primary key for N:M:P cardinalities', () => {
        const graph = createTernaryGraph()

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Imparte (
              id_asignatura_Imparte_1 VARCHAR(40),
              id_profesor_Imparte_2 VARCHAR(40),
              id_grupo_Imparte_3 VARCHAR(40),
              horas VARCHAR(40),
              PRIMARY KEY (
                id_asignatura_Imparte_1,
                id_profesor_Imparte_2,
                id_grupo_Imparte_3
              )
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Imparte
            ADD CONSTRAINT FK_id_asignatura_Imparte_1
            FOREIGN KEY (id_asignatura_Imparte_1)
            REFERENCES Asignatura(id_asignatura);
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Imparte
            ADD CONSTRAINT FK_id_profesor_Imparte_2
            FOREIGN KEY (id_profesor_Imparte_2)
            REFERENCES Profesor(id_profesor);
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Imparte
            ADD CONSTRAINT FK_id_grupo_Imparte_3
            FOREIGN KEY (id_grupo_Imparte_3)
            REFERENCES Grupo(id_grupo);
            `,
        )
    })

    test('should keep the maximum-one side outside the primary key and mark it as not null for 1:M:N cardinalities', () => {
        const graph = createTernaryGraph({
            side1Cardinality: '0:1',
            side2Cardinality: '0:N',
            side3Cardinality: '0:N',
        })

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Imparte (
              id_asignatura_Imparte_1 VARCHAR(40) NOT NULL,
              id_profesor_Imparte_2 VARCHAR(40),
              id_grupo_Imparte_3 VARCHAR(40),
              horas VARCHAR(40),
              PRIMARY KEY (
                id_profesor_Imparte_2,
                id_grupo_Imparte_3
              )
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            ALTER TABLE Imparte
            ADD CONSTRAINT FK_id_asignatura_Imparte_1
            FOREIGN KEY (id_asignatura_Imparte_1)
            REFERENCES Asignatura(id_asignatura);
            `,
        )
    })

    test('should render additional candidate keys as table unique constraints for 1:1:N cardinalities', () => {
        const graph = createTernaryGraph({
            side1Cardinality: '0:1',
            side2Cardinality: '0:1',
            side3Cardinality: '0:N',
        })

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Imparte (
              id_asignatura_Imparte_1 VARCHAR(40) NOT NULL,
              id_profesor_Imparte_2 VARCHAR(40),
              id_grupo_Imparte_3 VARCHAR(40),
              horas VARCHAR(40),
              PRIMARY KEY (
                id_profesor_Imparte_2,
                id_grupo_Imparte_3
              ),
              CONSTRAINT UQ_Imparte_candidate_2
              UNIQUE (
                id_asignatura_Imparte_1,
                id_grupo_Imparte_3
              )
            );
            `,
        )
    })
})