import { describe, expect, test } from 'vitest'
import {
    filterTables,
    mapErDiagramToRelationalModel,
    processTernaryRelation,
} from '../../../src/domain/relational/erToRelationalModel'
import {
    createAttribute,
    createRepeatedParticipantTernaryDiagram,
    createTernaryDiagram,
} from '../../helpers/diagramBuilders'

describe('Ternary relation table filtering', () => {
    test('should classify a ternary relation as a single ternary table candidate', () => {
        const graph = createTernaryDiagram()

        const tables = filterTables(graph)

        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe('TERNARY')
        expect(tables.at(0).side3.entity.name).toBe('Grupo')
    })

    test('should preserve ternary side roles in the intermediate relation table', () => {
        const graph = createRepeatedParticipantTernaryDiagram()

        const tables = filterTables(graph)

        expect(tables.at(0).side1.role).toBe('tenista local')
        expect(tables.at(0).side2.role).toBe('tenista visitante')
        expect(tables.at(0).side3.role).toBe('fecha')
    })
})

describe('Ternary relation extraction', () => {
    test('should create a relation table whose primary key uses the three sides for N:M:P cardinalities', () => {
        const graph = createTernaryDiagram()
        const filteredTables = filterTables(graph)

        const tables = processTernaryRelation(filteredTables.at(0), graph)
        const relationTable = tables.at(3)

        expect(tables.length).toBe(4)
        expect(relationTable.name).toBe('Imparte')
        expect(relationTable.attributes.map((attr) => attr.name)).toEqual([
            'id_asignatura_Imparte_1',
            'id_profesor_Imparte_2',
            'id_grupo_Imparte_3',
            'horas',
        ])
        expect(
            relationTable.attributes.slice(0, 3).map((attr) => attr.key),
        ).toEqual([true, true, true])
        expect(relationTable.attributes.at(3).key).toBe(false)
    })

    test('should use the other two sides as primary key when one side has maximum one', () => {
        const graph = createTernaryDiagram({
            side2Cardinality: '0:1',
        })
        const filteredTables = filterTables(graph)

        const tables = processTernaryRelation(filteredTables.at(0), graph)
        const relationTable = tables.at(3)
        const foreignKeys = relationTable.attributes.slice(0, 3)

        expect(foreignKeys.map((attr) => attr.key)).toEqual([
            true,
            false,
            true,
        ])
        expect(foreignKeys.at(1).notnull).toBe(true)
    })

    test('should represent additional candidate keys as unique constraints for 1:1:N cardinalities', () => {
        const graph = createTernaryDiagram({
            side1Cardinality: '0:1',
            side2Cardinality: '0:1',
        })
        const filteredTables = filterTables(graph)

        const tables = processTernaryRelation(filteredTables.at(0), graph)
        const relationTable = tables.at(3)
        const foreignKeys = relationTable.attributes.slice(0, 3)

        expect(foreignKeys.map((attr) => attr.key)).toEqual([
            false,
            true,
            true,
        ])
        expect(foreignKeys.at(0).notnull).toBe(true)
        expect(relationTable.uniqueConstraints).toEqual([
            {
                name: 'Imparte_candidate_2',
                columns: ['id_asignatura_Imparte_1', 'id_grupo_Imparte_3'],
            },
        ])
    })

    test('should use side roles as foreign key suffixes for repeated ternary participants', () => {
        const graph = createRepeatedParticipantTernaryDiagram()
        const filteredTables = filterTables(graph)

        const tables = processTernaryRelation(filteredTables.at(0), graph)
        const relationTable = tables.at(3)

        expect(relationTable.attributes.map((attr) => attr.name)).toEqual([
            'id_tenista_Juega_tenista_local',
            'id_tenista_Juega_tenista_visitante',
            'fecha_Juega_fecha',
        ])

        expect(
            relationTable.attributes.map((attr) => attr.foreign_key),
        ).toEqual(['Tenista', 'Tenista', 'Fecha'])
    })
})

describe('Additional ternary relation mapping coverage', () => {
    test('should represent all additional candidate keys as unique constraints for 1:1:1 cardinalities', () => {
        const graph = createTernaryDiagram({
            side1Cardinality: '0:1',
            side2Cardinality: '0:1',
            side3Cardinality: '0:1',
        })
        const filteredTables = filterTables(graph)

        const tables = processTernaryRelation(filteredTables.at(0), graph)
        const relationTable = tables.at(3)
        const foreignKeys = relationTable.attributes.slice(0, 3)

        expect(foreignKeys.map((attr) => attr.key)).toEqual([
            false,
            true,
            true,
        ])
        expect(foreignKeys.map((attr) => attr.notnull ?? false)).toEqual([
            true,
            false,
            false,
        ])
        expect(relationTable.uniqueConstraints).toEqual([
            {
                name: 'Imparte_candidate_2',
                columns: ['id_asignatura_Imparte_1', 'id_grupo_Imparte_3'],
            },
            {
                name: 'Imparte_candidate_3',
                columns: [
                    'id_asignatura_Imparte_1',
                    'id_profesor_Imparte_2',
                ],
            },
        ])
    })

    test('should use all leaf columns from a composite primary key in a ternary relation table', () => {
        const graph = createTernaryDiagram()

        graph.entities.at(0).attributes = [
            createAttribute({
                idMx: 'entity-asignatura-composite-key',
                name: 'codigo',
                key: true,
                children: [
                    createAttribute({
                        idMx: 'entity-asignatura-key-serie',
                        name: 'serie',
                    }),
                    createAttribute({
                        idMx: 'entity-asignatura-key-numero',
                        name: 'numero',
                    }),
                ],
            }),
        ]

        const filteredTables = filterTables(graph)

        const tables = processTernaryRelation(filteredTables.at(0), graph)
        const relationTable = tables.at(3)

        expect(relationTable.attributes.map((attr) => attr.name)).toEqual([
            'serie_Imparte_1',
            'numero_Imparte_1',
            'id_profesor_Imparte_2',
            'id_grupo_Imparte_3',
            'horas',
        ])
        expect(
            relationTable.attributes.slice(0, 2).map(
                (attr) => attr.foreign_key_column,
            ),
        ).toEqual(['serie', 'numero'])
        expect(
            relationTable.attributes.slice(0, 4).map((attr) => attr.key),
        ).toEqual([true, true, true, true])
    })

    test('should project composite relation attributes in the ternary relation table', () => {
        const graph = createTernaryDiagram()

        graph.relations.at(0).attributes = [
            createAttribute({
                idMx: 'relation-attribute-periodo',
                name: 'periodo',
                children: [
                    createAttribute({
                        idMx: 'relation-attribute-inicio',
                        name: 'inicio',
                    }),
                    createAttribute({
                        idMx: 'relation-attribute-fin',
                        name: 'fin',
                    }),
                ],
            }),
        ]

        const filteredTables = filterTables(graph)

        const tables = processTernaryRelation(filteredTables.at(0), graph)
        const relationTable = tables.at(3)

        expect(relationTable.attributes.map((attr) => attr.name)).toEqual([
            'id_asignatura_Imparte_1',
            'id_profesor_Imparte_2',
            'id_grupo_Imparte_3',
            'inicio',
            'fin',
        ])
        expect(
            relationTable.attributes.some((attr) => attr.name === 'periodo'),
        ).toBe(false)
    })

    test('should normalize ternary unique constraint names and columns in the full relational model', () => {
        const graph = createTernaryDiagram({
            side1Cardinality: '0:1',
            side2Cardinality: '0:1',
            side3Cardinality: '0:N',
        })

        graph.relations.at(0).name = 'Imparte Curso'

        const relationalModel = mapErDiagramToRelationalModel(graph)
        const relationTable = relationalModel.tables.find(
            (table) => table.name === 'Imparte_Curso',
        )

        expect(relationTable).toBeDefined()
        expect(relationTable.attributes.map((attr) => attr.name)).toEqual([
            'id_asignatura_Imparte_Curso_1',
            'id_profesor_Imparte_Curso_2',
            'id_grupo_Imparte_Curso_3',
            'horas',
        ])
        expect(relationTable.uniqueConstraints).toEqual([
            {
                name: 'Imparte_Curso_candidate_2',
                columns: [
                    'id_asignatura_Imparte_Curso_1',
                    'id_grupo_Imparte_Curso_3',
                ],
            },
        ])
    })

    test('should keep one entity table and one role-disambiguated ternary table for repeated participants', () => {
        const graph = createRepeatedParticipantTernaryDiagram()

        const relationalModel = mapErDiagramToRelationalModel(graph)
        const relationTable = relationalModel.tables.find(
            (table) => table.name === 'Juega',
        )

        expect(relationalModel.tables.map((table) => table.name)).toEqual([
            'Tenista',
            'Fecha',
            'Juega',
        ])

        expect(relationTable.attributes.map((attr) => attr.name)).toEqual([
            'id_tenista_Juega_tenista_local',
            'id_tenista_Juega_tenista_visitante',
            'fecha_Juega_fecha',
        ])

        expect(
            relationTable.attributes.map((attr) => attr.foreign_key),
        ).toEqual(['Tenista', 'Tenista', 'Fecha'])
    })
})