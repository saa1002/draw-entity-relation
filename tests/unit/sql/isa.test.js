import { describe, expect, test } from 'vitest'
import { generateSQL } from '../../../src/services/sql'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'

const { expectSQLToContain, expectSQLNotToContain } =
    buildSQLAssertions(expect)

const createIsaGraph = () => ({
    entities: [
        {
            idMx: 'entity-persona',
            name: 'Persona',
            weak: false,
            attributes: [
                {
                    idMx: 'attr-id-persona',
                    name: 'id_persona',
                    key: true,
                    partialKey: false,
                },
                {
                    idMx: 'attr-nombre',
                    name: 'nombre',
                    key: false,
                    partialKey: false,
                },
            ],
        },
        {
            idMx: 'entity-alumno',
            name: 'Alumno',
            weak: false,
            attributes: [
                {
                    idMx: 'attr-expediente',
                    name: 'expediente',
                    key: false,
                    partialKey: false,
                },
            ],
        },
        {
            idMx: 'entity-profesor',
            name: 'Profesor',
            weak: false,
            attributes: [
                {
                    idMx: 'attr-categoria',
                    name: 'categoria',
                    key: false,
                    partialKey: false,
                },
            ],
        },
    ],
    relations: [],
    isas: [
        {
            idMx: 'isa-persona',
            generalization: {
                edgeId: 'edge-persona',
                entity: { idMx: 'entity-persona' },
            },
            specializations: [
                {
                    edgeId: 'edge-alumno',
                    entity: { idMx: 'entity-alumno' },
                },
                {
                    edgeId: 'edge-profesor',
                    entity: { idMx: 'entity-profesor' },
                },
            ],
        },
    ],
})

const createCompositeIsaGraph = () => ({
    entities: [
        {
            idMx: 'entity-documento',
            name: 'Documento',
            weak: false,
            attributes: [
                {
                    idMx: 'attr-codigo',
                    name: 'codigo',
                    key: true,
                    partialKey: false,
                    children: [
                        {
                            idMx: 'attr-serie',
                            name: 'serie',
                            key: false,
                            partialKey: false,
                        },
                        {
                            idMx: 'attr-numero',
                            name: 'numero',
                            key: false,
                            partialKey: false,
                        },
                    ],
                },
                {
                    idMx: 'attr-titulo',
                    name: 'titulo',
                    key: false,
                    partialKey: false,
                },
            ],
        },
        {
            idMx: 'entity-libro',
            name: 'Libro',
            weak: false,
            attributes: [
                {
                    idMx: 'attr-isbn',
                    name: 'isbn',
                    key: false,
                    partialKey: false,
                },
            ],
        },
    ],
    relations: [],
    isas: [
        {
            idMx: 'isa-documento',
            generalization: {
                edgeId: 'edge-documento',
                entity: { idMx: 'entity-documento' },
            },
            specializations: [
                {
                    edgeId: 'edge-libro',
                    entity: { idMx: 'entity-libro' },
                },
            ],
        },
    ],
})

describe('ISA SQL generation', () => {
    test('should generate specialization tables whose inherited key is both primary key and foreign key', () => {
        const sql = generateSQL(createIsaGraph())

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
            id_persona VARCHAR(40) PRIMARY KEY,
            expediente VARCHAR(40),
            CONSTRAINT FK_Alumno_Persona_isa
            FOREIGN KEY (id_persona)
            REFERENCES Persona(id_persona)
            );
            `,
        )

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Profesor (
            id_persona VARCHAR(40) PRIMARY KEY,
            categoria VARCHAR(40),
            CONSTRAINT FK_Profesor_Persona_isa
            FOREIGN KEY (id_persona)
            REFERENCES Persona(id_persona)
            );
            `,
        )

        expectSQLNotToContain(sql, 'ALTER TABLE')
    })

    test('should inherit composite primary keys in specialization tables', () => {
        const sql = generateSQL(createCompositeIsaGraph())

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
            CONSTRAINT FK_Libro_Documento_isa
            FOREIGN KEY (serie, numero)
            REFERENCES Documento(serie, numero)
            );
            `,
        )

        expectSQLNotToContain(sql, 'codigo VARCHAR(40)')
        expectSQLNotToContain(sql, 'ALTER TABLE')
    })

    test('should use the inherited specialization key when another relation references the specialization', () => {
        const graph = createIsaGraph()

        graph.entities.push({
            idMx: 'entity-matricula',
            name: 'Matricula',
            weak: false,
            attributes: [
                {
                    idMx: 'attr-id-matricula',
                    name: 'id_matricula',
                    key: true,
                    partialKey: false,
                },
            ],
        })

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
            id_persona_Realiza VARCHAR(40) NOT NULL,
            CONSTRAINT FK_id_persona_Realiza
            FOREIGN KEY (id_persona_Realiza)
            REFERENCES Alumno(id_persona)
            );
            `,
        )

        expectSQLNotToContain(sql, 'ALTER TABLE')
    })
    
    test('should generate an attribute-less specialization table with inherited key and relationship foreign key', () => {
        const graph = createIsaGraph()

        const profesor = graph.entities.find(
            (entity) => entity.idMx === 'entity-profesor',
        )
        profesor.attributes = []

        graph.entities.push({
            idMx: 'entity-departamento',
            name: 'Departamento',
            weak: false,
            attributes: [
                {
                    idMx: 'attr-id-departamento',
                    name: 'id_departamento',
                    key: true,
                    partialKey: false,
                },
                {
                    idMx: 'attr-nombre-departamento',
                    name: 'nombre_departamento',
                    key: false,
                    partialKey: false,
                },
            ],
        })

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
            id_persona VARCHAR(40) PRIMARY KEY,
            id_departamento_Asignado VARCHAR(40) UNIQUE NOT NULL,
            CONSTRAINT FK_Profesor_Persona_isa
            FOREIGN KEY (id_persona)
            REFERENCES Persona(id_persona),
            CONSTRAINT FK_id_departamento_Asignado
            FOREIGN KEY (id_departamento_Asignado)
            REFERENCES Departamento(id_departamento)
            );
            `,
        )

        expectSQLNotToContain(sql, 'ALTER TABLE')
    })
})