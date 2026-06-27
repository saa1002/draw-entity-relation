import { describe, expect, test } from 'vitest'
import { generateSQL } from '../../../src/services/sql'
import {
    createRepeatedParticipantTernaryDiagram,
    createTernaryDiagram,
} from '../../helpers/diagramBuilders'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'

const { expectSQLToContain } = buildSQLAssertions(expect)

describe('Ternary relationship SQL generation', () => {
    test('should generate a ternary relation table with a three-column primary key for N:M:P cardinalities', () => {
        const graph = createTernaryDiagram()

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Imparte (
            id_asignatura_Imparte_1 VARCHAR(40) REFERENCES Asignatura,
            id_profesor_Imparte_2 VARCHAR(40) REFERENCES Profesor,
            id_grupo_Imparte_3 VARCHAR(40) REFERENCES Grupo,
            horas VARCHAR(40), 
            PRIMARY KEY (id_asignatura_Imparte_1, id_profesor_Imparte_2, id_grupo_Imparte_3)
            );
            `,
        )
    })

    test('should keep the maximum-one side outside the primary key and mark it as not null for 1:M:N cardinalities', () => {
        const graph = createTernaryDiagram({
            side1Cardinality: '0:1',
            side2Cardinality: '0:N',
            side3Cardinality: '0:N',
        })

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Imparte (
            id_asignatura_Imparte_1 VARCHAR(40) NOT NULL REFERENCES Asignatura,
            id_profesor_Imparte_2 VARCHAR(40) REFERENCES Profesor,
            id_grupo_Imparte_3 VARCHAR(40) REFERENCES Grupo,
            horas VARCHAR(40), 
            PRIMARY KEY (id_profesor_Imparte_2, id_grupo_Imparte_3)
            );
            `,
        )      
    })

    test('should render additional candidate keys as table unique constraints for 1:1:N cardinalities', () => {
        const graph = createTernaryDiagram({
            side1Cardinality: '0:1',
            side2Cardinality: '0:1',
            side3Cardinality: '0:N',
        })

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Imparte (
            id_asignatura_Imparte_1 VARCHAR(40) NOT NULL REFERENCES Asignatura,
            id_profesor_Imparte_2 VARCHAR(40) REFERENCES Profesor,
            id_grupo_Imparte_3 VARCHAR(40) REFERENCES Grupo,
            horas VARCHAR(40), 
            PRIMARY KEY (id_profesor_Imparte_2, id_grupo_Imparte_3), 
            CONSTRAINT UQ_Imparte_candidate_2 UNIQUE (id_asignatura_Imparte_1, id_grupo_Imparte_3)
            );
            `,
        )
    })

    test('should generate distinct foreign keys for repeated ternary participants', () => {
        const graph = createRepeatedParticipantTernaryDiagram()

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Juega (
            id_tenista_Juega_tenista_local VARCHAR(40) REFERENCES Tenista,
            id_tenista_Juega_tenista_visitante VARCHAR(40) REFERENCES Tenista,
            fecha_Juega_fecha VARCHAR(40) REFERENCES Fecha, 
            PRIMARY KEY (id_tenista_Juega_tenista_local, id_tenista_Juega_tenista_visitante, fecha_Juega_fecha)
            );
            `,
        )
    })
})