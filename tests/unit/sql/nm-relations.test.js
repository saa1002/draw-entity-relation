import { beforeEach, describe, expect, test } from 'vitest'
import { createAttribute } from '../../helpers/diagramBuilders'
import { buildSQLAssertions } from '../../helpers/sqlAssertions'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { generateSQL } from '../../../src/services/sql'

let nMGraph

const { expectSQLToContain } = buildSQLAssertions(expect)

beforeEach(() => {
    nMGraph = loadGraphFixture('n-m-relation.json')
})

describe('N:M relation SQL generation', () => {
    test('should generate a separate table for a simple multivalued attribute on an N:M related entity', () => {
        nMGraph.entities.at(0).attributes.push(
            createAttribute({
                idMx: 'attr-email',
                name: 'email',
                multivalued: true,
            }),
        )

        const sql = generateSQL(nMGraph)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_email (
            Atributo VARCHAR(40) REFERENCES Entidad ON DELETE CASCADE ON UPDATE CASCADE,
            email VARCHAR(40), 
            PRIMARY KEY (Atributo, email)
            )
            `,
        )

        expect(sql).not.toContain('email_Relacion')
    })
})