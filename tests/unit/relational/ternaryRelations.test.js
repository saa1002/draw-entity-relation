import { describe, expect, test } from 'vitest'
import { RELATION_ARITIES } from '../../../src/domain/er/relations'
import {
    filterTables,
    processTernaryRelation,
} from '../../../src/domain/relational/erToRelationalModel'

const createEntity = ({ idMx, name, keyName }) => ({
    idMx,
    name,
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

describe('Ternary relation table filtering', () => {
    test('should classify a ternary relation as a single ternary table candidate', () => {
        const graph = createTernaryGraph()

        const tables = filterTables(graph)

        expect(tables.length).toBe(1)
        expect(tables.at(0).type).toBe('TERNARY')
        expect(tables.at(0).side3.entity.name).toBe('Grupo')
    })
})

describe('Ternary relation extraction', () => {
    test('should create a relation table whose primary key uses the three sides for N:M:P cardinalities', () => {
        const graph = createTernaryGraph()
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
        const graph = createTernaryGraph({
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
        const graph = createTernaryGraph({
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
})