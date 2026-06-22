import { describe, expect, test } from 'vitest'
import { getEntityPrimaryKeyColumnReferences } from '../../../src/domain/relational/entityKeyColumns'
import { mapErDiagramToRelationalModel } from '../../../src/domain/relational/erToRelationalModel'
import { createBasicIsaDiagram } from '../../helpers/diagramBuilders'

describe('ISA relational transformation', () => {
    test('should generate one ordinary table for the generalization and one table per specialization', () => {
        const graph = createBasicIsaDiagram()

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
        const graph = createBasicIsaDiagram()
        const alumno = graph.entities.find((entity) => entity.name === 'Alumno')

        expect(getEntityPrimaryKeyColumnReferences(alumno, graph)).toEqual([
            {
                name: 'id_persona',
                referencedColumn: 'id_persona',
            },
        ])
    })
})