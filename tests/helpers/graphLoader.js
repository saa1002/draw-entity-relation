import { readFileSync } from 'fs'
import path from 'path'

export function loadGraphFixture(fileName) {
    const filePath = path.join(process.cwd(), 'tests', 'graphs', fileName)
    const raw = readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
}