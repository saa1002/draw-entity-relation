import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { validateGraph } from '../../../src/utils/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe("General validation function", () => {
    test("correct graph return true", () => {
        expect(validateGraph(graph).isValid).toBe(true)
    })
})