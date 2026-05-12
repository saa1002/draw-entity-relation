import { describe, expect, test } from 'vitest'
import { projectAttributeTreeToColumns } from '../../../src/domain/relational/attributeProjection'

describe('Attribute relational projection', () => {
    test('flat attributes should preserve their current relational projection', () => {
        const attributes = [
            {
                idMx: 'attr-1',
                name: 'id_cliente',
                key: true,
                partialKey: false,
            },
            {
                idMx: 'attr-2',
                name: 'nombre',
                key: false,
                partialKey: false,
            },
        ]

        expect(projectAttributeTreeToColumns(attributes)).toEqual([
            {
                name: 'id_cliente',
                key: true,
                partialKey: false,
            },
            {
                name: 'nombre',
                key: false,
                partialKey: false,
            },
        ])
    })

    test('composite attributes should project only their leaf attributes', () => {
        const attributes = [
            {
                idMx: 'attr-1',
                name: 'direccion',
                children: [
                    {
                        idMx: 'attr-2',
                        name: 'calle',
                    },
                    {
                        idMx: 'attr-3',
                        name: 'ciudad',
                    },
                ],
            },
        ]

        expect(projectAttributeTreeToColumns(attributes)).toEqual([
            {
                name: 'direccion_calle',
                key: false,
                partialKey: false,
            },
            {
                name: 'direccion_ciudad',
                key: false,
                partialKey: false,
            },
        ])
    })

    test('nested composite attributes should use the full attribute path', () => {
        const attributes = [
            {
                idMx: 'attr-1',
                name: 'contacto',
                children: [
                    {
                        idMx: 'attr-2',
                        name: 'direccion',
                        children: [
                            {
                                idMx: 'attr-3',
                                name: 'ciudad',
                            },
                        ],
                    },
                ],
            },
        ]

        expect(projectAttributeTreeToColumns(attributes)).toEqual([
            {
                name: 'contacto_direccion_ciudad',
                key: false,
                partialKey: false,
            },
        ])
    })

    test('a composite key should project all of its leaf attributes as key columns', () => {
        const attributes = [
            {
                idMx: 'attr-1',
                name: 'documento',
                key: true,
                partialKey: false,
                children: [
                    {
                        idMx: 'attr-2',
                        name: 'tipo',
                    },
                    {
                        idMx: 'attr-3',
                        name: 'numero',
                    },
                ],
            },
        ]

        expect(projectAttributeTreeToColumns(attributes)).toEqual([
            {
                name: 'documento_tipo',
                key: true,
                partialKey: false,
            },
            {
                name: 'documento_numero',
                key: true,
                partialKey: false,
            },
        ])
    })

    test('a composite partial key should project all of its leaf attributes as partial key columns', () => {
        const attributes = [
            {
                idMx: 'attr-1',
                name: 'codigo',
                key: false,
                partialKey: true,
                children: [
                    {
                        idMx: 'attr-2',
                        name: 'serie',
                    },
                    {
                        idMx: 'attr-3',
                        name: 'numero',
                    },
                ],
            },
        ]

        expect(projectAttributeTreeToColumns(attributes)).toEqual([
            {
                name: 'codigo_serie',
                key: false,
                partialKey: true,
            },
            {
                name: 'codigo_numero',
                key: false,
                partialKey: true,
            },
        ])
    })
    test('simple multivalued attributes should not project as regular columns', () => {
        const attributes = [
            {
                idMx: 'attr-1',
                name: 'id_cliente',
                key: true,
                partialKey: false,
            },
            {
                idMx: 'attr-2',
                name: 'telefono',
                key: false,
                partialKey: false,
                multivalued: true,
            },
        ]

        expect(projectAttributeTreeToColumns(attributes)).toEqual([
            {
                name: 'id_cliente',
                key: true,
                partialKey: false,
            },
        ])
    })
})