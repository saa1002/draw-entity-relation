import { describe, expect, test } from 'vitest'
import { generateSQL } from '../../../src/services/sql'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import {
    createAttribute,
    createBasicIsaDiagram,
    createCompositeIsaDiagram,
    createStrongEntity,
} from '../../helpers/diagramBuilders'

const { expectSQLToContain, expectSQLNotToContain } =
    buildSQLAssertions(expect)

describe('ISA SQL generation', () => {
    test('should generate specialization tables whose inherited key is both primary key and foreign key', () => {
        const sql = generateSQL(createBasicIsaDiagram())

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Persona (
              id_persona VARCHAR(40) PRIMARY KEY,
              nombre VARCHAR(40)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Alumno (
            id_persona VARCHAR(40) PRIMARY KEY REFERENCES Persona,
            expediente VARCHAR(40)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Profesor (
            id_persona VARCHAR(40) PRIMARY KEY REFERENCES Persona,
            categoria VARCHAR(40)
            );
            `,
        )

        expectSQLNotToContain(sql, 'ALTER TABLE')
    })

    test('should inherit composite primary keys in specialization tables', () => {
        const sql = generateSQL(createCompositeIsaDiagram())

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Documento (
              serie VARCHAR(40),
              numero VARCHAR(40),
              titulo VARCHAR(40),
              PRIMARY KEY (serie, numero)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Libro (
            serie VARCHAR(40),
            numero VARCHAR(40),
            isbn VARCHAR(40), 
            PRIMARY KEY (serie, numero), 
            FOREIGN KEY (serie, numero) REFERENCES Documento
            );
            `,
        )

        expectSQLNotToContain(sql, 'codigo VARCHAR(40)')
        expectSQLNotToContain(sql, 'ALTER TABLE')
    })

    test('should use the inherited specialization key when another relation references the specialization', () => {
        const graph = createBasicIsaDiagram()

        graph.entities.push(
            createStrongEntity({
                idMx: 'entity-matricula',
                name: 'Matricula',
                keyName: 'id_matricula',
            }),
        )

        graph.relations.push({
            idMx: 'relation-realiza',
            name: 'Realiza',
            isIdentifying: false,
            attributes: [],
            side1: {
                idMx: 'side-alumno',
                cardinality: '1:1',
                entity: { idMx: 'entity-alumno' },
            },
            side2: {
                idMx: 'side-matricula',
                cardinality: '0:N',
                entity: { idMx: 'entity-matricula' },
            },
        })

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Matricula (
            id_matricula VARCHAR(40) PRIMARY KEY,
            id_persona_Realiza VARCHAR(40) NOT NULL REFERENCES Alumno
            );
            `,
        )

        expectSQLNotToContain(sql, 'ALTER TABLE')
    })
    
    test('should generate an attribute-less specialization table with inherited key and relationship foreign key', () => {
        const graph = createBasicIsaDiagram()

        const profesor = graph.entities.find(
            (entity) => entity.idMx === 'entity-profesor',
        )
        profesor.attributes = []

        graph.entities.push(
            createStrongEntity({
                idMx: 'entity-departamento',
                name: 'Departamento',
                attributes: [
                    createAttribute({
                        idMx: 'attr-id-departamento',
                        name: 'id_departamento',
                        key: true,
                    }),
                    createAttribute({
                        idMx: 'attr-nombre-departamento',
                        name: 'nombre_departamento',
                    }),
                ],
            }),
        )

        graph.relations.push({
            idMx: 'relation-asignado',
            name: 'Asignado',
            isIdentifying: false,
            canHoldAttributes: false,
            attributes: [],
            side1: {
                idMx: 'side-profesor',
                cardinality: '0:1',
                entity: { idMx: 'entity-profesor' },
            },
            side2: {
                idMx: 'side-departamento',
                cardinality: '1:1',
                entity: { idMx: 'entity-departamento' },
            },
        })

        const sql = generateSQL(graph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Profesor (
            id_persona VARCHAR(40) PRIMARY KEY REFERENCES Persona,
            id_departamento_Asignado VARCHAR(40) UNIQUE NOT NULL REFERENCES Departamento
            );
            `,
        )

        expectSQLNotToContain(sql, 'ALTER TABLE')
    })
})