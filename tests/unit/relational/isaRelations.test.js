import { describe, expect, test } from 'vitest'
import { getEntityPrimaryKeyColumnReferences } from '../../../src/domain/relational/entityKeyColumns'
import { mapErDiagramToRelationalModel } from '../../../src/domain/relational/erToRelationalModel'

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

describe('ISA relational transformation', () => {
    test('should generate one ordinary table for the generalization and one table per specialization', () => {
        const graph = createIsaGraph()

        const relationalModel = mapErDiagramToRelationalModel(graph)
        const personaTable = relationalModel.tables.find(
            (table) => table.name === 'Persona',
        )
        const alumnoTable = relationalModel.tables.find(
            (table) => table.name === 'Alumno',
        )
        const profesorTable = relationalModel.tables.find(
            (table) => table.name === 'Profesor',
        )

        expect(personaTable.attributes).toEqual([
            {
                name: 'id_persona',
                key: true,
                partialKey: false,
                notnull: false,
                unique: false,
            },
            {
                name: 'nombre',
                key: false,
                partialKey: false,
                notnull: false,
                unique: false,
            },
        ])

        expect(alumnoTable.attributes).toMatchObject([
            {
                name: 'id_persona',
                key: true,
                partialKey: false,
                foreign_key: 'Persona',
                foreign_key_column: 'id_persona',
            },
            {
                name: 'expediente',
                key: false,
                partialKey: false,
            },
        ])

        expect(profesorTable.attributes).toMatchObject([
            {
                name: 'id_persona',
                key: true,
                partialKey: false,
                foreign_key: 'Persona',
                foreign_key_column: 'id_persona',
            },
            {
                name: 'categoria',
                key: false,
                partialKey: false,
            },
        ])
    })

    test('should resolve a specialization primary key from its generalization', () => {
        const graph = createIsaGraph()
        const alumno = graph.entities.find((entity) => entity.name === 'Alumno')

        expect(getEntityPrimaryKeyColumnReferences(alumno, graph)).toEqual([
            {
                name: 'id_persona',
                referencedColumn: 'id_persona',
            },
        ])
    })
})