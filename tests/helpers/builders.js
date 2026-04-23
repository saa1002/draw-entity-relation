let sequence = 1

export function resetBuilderIds() {
    sequence = 1
}

function nextId(prefix) {
    return `${prefix}-${sequence++}`
}

export function makeAttribute(overrides = {}) {
    const idMx = overrides.idMx ?? nextId('attr')

    return {
        idMx,
        name: overrides.name ?? `Atributo_${idMx}`,
        key: false,
        partialKey: false,
        ...overrides,
    }
}

export function makeEntity(overrides = {}) {
    const idMx = overrides.idMx ?? nextId('entity')

    return {
        idMx,
        name: overrides.name ?? `Entidad_${idMx}`,
        weak: false,
        ownerEntityId: null,
        identifyingRelationId: null,
        attributes: [makeAttribute({ name: `id_${idMx}`, key: true })],
        ...overrides,
    }
}

export function makeRelationSide(overrides = {}) {
    return {
        idMx: overrides.idMx ?? nextId('side'),
        cardinality: overrides.cardinality ?? '0:1',
        cell: overrides.cell ?? nextId('cell'),
        entity: {
            idMx: overrides.entityId ?? '',
        },
    }
}

export function makeRelation(overrides = {}) {
    const idMx = overrides.idMx ?? nextId('relation')

    return {
        idMx,
        name: overrides.name ?? `Relacion_${idMx}`,
        canHoldAttributes: false,
        isIdentifying: false,
        attributes: [],
        side1: overrides.side1 ?? makeRelationSide(),
        side2: overrides.side2 ?? makeRelationSide(),
        ...overrides,
    }
}

export function makeGraph({ entities = [], relations = [] } = {}) {
    return {
        entities,
        relations,
    }
}