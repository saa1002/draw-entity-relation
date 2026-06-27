import { beforeEach, describe, expect, test } from 'vitest'
import { createDiagram } from '../../helpers/diagramBuilders'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { validateGraph } from '../../../src/domain/er/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe('General graph validation', () => {
    test('An empty graph should be invalid', () => {
        const diagnostics = validateGraph(createDiagram())

        expect(diagnostics.notEmpty).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test('A valid graph should pass validation', () => {
        expect(validateGraph(graph).isValid).toBe(true)
    })
})