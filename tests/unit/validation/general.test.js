import { beforeEach, describe, expect, test } from 'vitest'
import { loadGraphFixture } from '../../helpers/graphLoader'
import { validateGraph, sqlIdentifierCollisions } from '../../../src/utils/validation'

let graph

beforeEach(() => {
    graph = loadGraphFixture('example.json')
})

describe("General validation function", () => {
    test("empty graph should be invalid", () => {
        
        const emptyGraph = {
            entities: [],
            relations: [],
        }

        const diagnostics = validateGraph(emptyGraph)

        expect(diagnostics.notEmpty).toBe(false)
        expect(diagnostics.isValid).toBe(false)
    })

    test("a valid graph should pass validation", () => {
        expect(validateGraph(graph).isValid).toBe(true)
    })
    
    test("normalized SQL identifiers should not collide", () => {
        expect(sqlIdentifierCollisions(graph)).toBe(false)

        graph.entities.at(0).name = "País"
        graph.entities.at(1).name = "Pais"

        expect(sqlIdentifierCollisions(graph)).toBe(true)
        expect(validateGraph(graph).noSQLIdentifierCollisions).toBe(false)
    })

})

/*
 Temporary architecture guard kept only as a reference for the mxgraph-js migration check done previously.

import fs from 'fs'
import path from 'path'

describe("Architecture", () => {
    test("mxgraph-js is not present in package.json nor imported in src/", () => {
        const root = process.cwd()

        const pkgPath = path.join(root, "package.json")
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
        const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }

        expect(deps["mxgraph-js"]).toBeUndefined()

        const srcDir = path.join(root, "src")
        const offenders = []

        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, entry.name)
                if (entry.isDirectory()) walk(p)
                else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
                    const raw = fs.readFileSync(p, "utf-8")
                    if (raw.includes("mxgraph-js")) offenders.push(path.relative(root, p))
                }
            }
        }

        walk(srcDir)

        expect(offenders).toEqual([])
    })
})
*/