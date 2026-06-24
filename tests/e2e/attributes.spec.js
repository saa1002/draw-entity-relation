import { test, expect } from '@playwright/test';
import { buildSQLAssertions } from '../helpers/sqlAssertions';

import {
    addAttributeToSelectedEntity,
    addEntity,
    enableMxGraphDebug,
    expectAttributeCellVisible,
    expectSavedEntityAttributeToMatch,
    getSavedEntity,
    selectAttributesByName,
    selectAttributeByName,
    selectEntity,
    renameElement,
    clickCompositeAttributeConnector,
    dragCompositeAttributeRootEdge,
    clearGraphSelection,
} from '../helpers/canvas';

import { exportCurrentSqlScript, seedSavedDiagram } from '../helpers/persistence';

const { expectSQLToContain } = buildSQLAssertions(expect);

test.beforeEach(async ({ page }) => {
    await enableMxGraphDebug(page);
});

const findRootAttributeByName = (entity, attributeName) =>
    entity?.attributes?.find((attribute) => attribute.name === attributeName);

test.describe('basic entity attributes', () => {
    test('add attributes to an entity', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);
        await selectEntity(page, 'Entidad');

        await addAttributeToSelectedEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: true,
            partialKey: false,
        });

        await renameElement(page, 'Atributo', 'Clave');

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Clave',
        });

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 2, {
            name: 'Atributo',
        });
    });

    test('hide/show attributes', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);
        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await expect(page.getByText('Atributo', { exact: true })).toBeVisible();

        await selectEntity(page, 'Entidad');
        await page
            .getByRole('button', { name: 'Ocultar atributos' })
            .click();

        await expect(page.getByText('Atributo', { exact: true })).toBeHidden();

        await page
            .getByRole('button', { name: 'Mostrar atributos' })
            .click();

        await expect(page.getByText('Atributo', { exact: true })).toBeVisible();
    });

    test('toggle primary key on an entity attribute', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: true,
            partialKey: false,
        });

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
        });

        await page.getByText('Atributo', { exact: true }).click();

        await page.getByRole('button', { name: 'Convertir en clave' }).click();

        await expect(
            page.getByText('Atributo marcado como clave').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: false,
            partialKey: false,
        });

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: true,
            partialKey: false,
        });

        await page.getByText('Atributo', { exact: true }).click();

        await page.getByRole('button', { name: 'Quitar clave' }).click();

        await expect(
            page.getByText('Clave eliminada del atributo').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
        });
    });

    test('toggle discriminant on an entity attribute', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: true,
            partialKey: false,
        });

        await selectEntity(page, 'Entidad');

        await page
            .getByRole('button', { name: 'Marcar como entidad débil' })
            .click();

        await expect(
            page.getByText('Entidad marcada como débil').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: false,
            partialKey: true,
        });

        await page.getByText('id', { exact: true }).click();

        await page
            .getByRole('button', { name: 'Quitar discriminante' })
            .click();

        await expect(
            page.getByText('Discriminante eliminado').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: false,
            partialKey: false,
        });

        await page
            .getByRole('button', { name: 'Convertir en discriminante' })
            .click();

        await expect(
            page.getByText('Atributo marcado como discriminante').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: false,
            partialKey: true,
        });
    });
});
test.describe('composite attributes', () => {
    test('hide/show attributes also affects nested attribute trees', async ({ page }) => {
        const diagram = {
            entities: [
                {
                    idMx: '10',
                    name: 'Documento',
                    position: { x: 100, y: 100 },
                    weak: false,
                    ownerEntityId: null,
                    identifyingRelationId: null,
                    attributes: [
                        {
                            idMx: '20',
                            name: 'codigo',
                            position: { x: 220, y: 100 },
                            key: true,
                            partialKey: false,
                            cell: ['20', 'edge_attr_codigo'],
                            offsetX: 120,
                            offsetY: 0,
                            children: [
                                {
                                    idMx: '21',
                                    name: 'serie',
                                    position: { x: 340, y: 70 },
                                    key: false,
                                    partialKey: false,
                                    cell: ['21', 'edge_attr_serie'],
                                    offsetX: 120,
                                    offsetY: -30,
                                },
                                {
                                    idMx: '22',
                                    name: 'numero',
                                    position: { x: 340, y: 130 },
                                    key: false,
                                    partialKey: false,
                                    cell: ['22', 'edge_attr_numero'],
                                    offsetX: 120,
                                    offsetY: 30,
                                },
                            ],
                        },
                    ],
                },
            ],
            relations: [],
        };

        await seedSavedDiagram(page, diagram);

        await page.goto('/');

        await expect(page.getByText('codigo', { exact: true })).toHaveCount(0);
        await expectAttributeCellVisible(page, 'Documento', 'codigo', true);
        await expect(page.getByText('serie', { exact: true })).toBeVisible();
        await expect(page.getByText('numero', { exact: true })).toBeVisible();

        await selectEntity(page, 'Documento');

        await page
            .getByRole('button', { name: 'Ocultar atributos' })
            .click();

        await expect(page.getByText('codigo', { exact: true })).toHaveCount(0);
        await expectAttributeCellVisible(page, 'Documento', 'codigo', false);
        await expect(page.getByText('serie', { exact: true })).toBeHidden();
        await expect(page.getByText('numero', { exact: true })).toBeHidden();

        await page
            .getByRole('button', { name: 'Mostrar atributos' })
            .click();

        await expect(page.getByText('codigo', { exact: true })).toHaveCount(0);
        await expectAttributeCellVisible(page, 'Documento', 'codigo', true);
        await expect(page.getByText('serie', { exact: true })).toBeVisible();
        await expect(page.getByText('numero', { exact: true })).toBeVisible();
    });

    test('add child attributes to an existing attribute', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);
        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await renameElement(page, 'Atributo', 'codigo');

        await page.getByText('codigo', { exact: true }).click();
        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();

        await expect(page.getByText('Subatributo hermano insertado').last()).toBeVisible();
        await expect(page.getByText('Atributo', { exact: true })).toBeVisible();

        await renameElement(page, 'Atributo', 'serie');

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');

                return findRootAttributeByName(entity, 'codigo')?.children?.map(
                    (attribute) => attribute.name,
                );
            })
            .toEqual(['codigo', 'serie']);
    });

    test('create a composite attribute with multiple child attributes from the editor', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);
        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await renameElement(page, 'Atributo', 'codigo');

        await page.getByText('codigo', { exact: true }).click();

        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();
        await renameElement(page, 'Atributo', 'serie');

        await selectAttributeByName(page, 'Entidad', 'codigo');

        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();
        await renameElement(page, 'Atributo', 'numero');

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');

                return findRootAttributeByName(entity, 'codigo');
            })
            .toMatchObject({
                name: 'codigo',
                key: false,
                children: [
                    {
                        name: 'codigo',
                        key: false,
                        partialKey: false,
                    },
                    {
                        name: 'serie',
                        key: false,
                        partialKey: false,
                    },
                    {
                        name: 'numero',
                        key: false,
                        partialKey: false,
                    },
                ],
            });

        await expect(page.getByText('codigo', { exact: true })).toBeVisible();
        await expect(page.getByText('serie', { exact: true })).toBeVisible();
        await expect(page.getByText('numero', { exact: true })).toBeVisible();
    });

    test('delete a UI-created child attribute and clean up the parent children list', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);
        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await renameElement(page, 'Atributo', 'codigo');

        await page.getByText('codigo', { exact: true }).click();
        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();

        await renameElement(page, 'Atributo', 'serie');

        page.on('dialog', async (dialog) => {
            await dialog.accept();
        });

        await page.getByText('serie', { exact: true }).click();
        await page.getByRole('button', { name: 'Borrar' }).click();

        await expect(page.getByText('codigo', { exact: true })).toBeVisible();
        await expect(page.getByText('serie', { exact: true })).toHaveCount(0);

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');

                return findRootAttributeByName(entity, 'codigo');
            })
            .toEqual(
                expect.not.objectContaining({
                    children: expect.any(Array),
                }),
            );
    });

});

test.describe('multivalued attributes', () => {
    test('toggle simple multivalued attributes and persist across reloads', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await page.getByText('id', { exact: true }).click();

        await expect(
            page.getByRole('button', { name: 'Marcar multivaluado' }),
        ).toHaveCount(0);

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
        });

        await page.getByText('Atributo', { exact: true }).click();

        await page.getByRole('button', { name: 'Marcar multivaluado' }).click();

        await expect(
            page.getByText('Atributo marcado como multivaluado').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
            multivalued: true,
        });

        await expect(
            page.getByRole('button', { name: 'Quitar multivaluado' }),
        ).toBeVisible();

        await expect(
            page.getByRole('button', { name: 'Añadir subatributo hermano' }),
        ).toHaveCount(0);

        await page.reload();

        await expect(page.getByText('Atributo', { exact: true })).toBeVisible();

        await page.getByText('Atributo', { exact: true }).click();

        await expect(
            page.getByRole('button', { name: 'Quitar multivaluado' }),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'Atributo',
            key: false,
            partialKey: false,
            multivalued: true,
        });

        await page.getByRole('button', { name: 'Quitar multivaluado' }).click();

        await expect(
            page.getByText('Multivaluado eliminado del atributo').last(),
        ).toBeVisible();

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');
                const attribute = findRootAttributeByName(entity, 'Atributo');

                return {
                    multivalued: attribute?.multivalued,
                    hasMultivaluedFlag: Object.prototype.hasOwnProperty.call(
                        attribute ?? {},
                        'multivalued',
                    ),
                };
            })
            .toEqual({
                multivalued: undefined,
                hasMultivaluedFlag: false,
            });
    });

    test('toggle composite multivalued attributes and persist across reloads', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: true,
            partialKey: false,
        });

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await renameElement(page, 'Atributo', 'contacto');

        await page.getByText('contacto', { exact: true }).click();
        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();

        await renameElement(page, 'Atributo', 'prefijo');

        await selectAttributeByName(page, 'Entidad', 'contacto');
        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();

        await renameElement(page, 'Atributo', 'numero');

        await page.getByText('prefijo', { exact: true }).click();

        await expect(
            page.getByRole('button', {
                name: 'Marcar compuesto como multivaluado',
            }),
        ).toBeVisible();

        await page.getByText('contacto', { exact: true }).click();

        await expect(
            page.getByRole('button', {
                name: 'Marcar compuesto como multivaluado',
            }),
        ).toBeVisible();

        await page
            .getByRole('button', {
                name: 'Marcar compuesto como multivaluado',
            })
            .click();

        await expect(
            page.getByText('Atributo marcado como multivaluado').last(),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'contacto',
            key: false,
            partialKey: false,
            multivalued: true,
            children: [
                {
                    name: 'contacto',
                    key: false,
                    partialKey: false,
                },
                {
                    name: 'prefijo',
                    key: false,
                    partialKey: false,
                },
                {
                    name: 'numero',
                    key: false,
                    partialKey: false,
                },
            ],
        });

        await expect(
            page.getByRole('button', {
                name: 'Quitar multivaluado del compuesto',
            }),
        ).toBeVisible();

        await expect(
            page.getByRole('button', { name: 'Añadir subatributo hermano' }),
        ).toBeVisible();

        await page.reload();

        await expect(page.getByText('contacto', { exact: true })).toBeVisible();
        await expectAttributeCellVisible(page, 'Entidad', 'contacto', true);
        await expect(page.getByText('prefijo', { exact: true })).toBeVisible();
        await expect(page.getByText('numero', { exact: true })).toBeVisible();

        await page.getByText('numero', { exact: true }).click();

        await expect(
            page.getByRole('button', {
                name: 'Quitar multivaluado del compuesto',
            }),
        ).toBeVisible();

        await page.getByText('contacto', { exact: true }).click();

        await expect(
            page.getByRole('button', {
                name: 'Quitar multivaluado del compuesto',
            }),
        ).toBeVisible();

        await expect(
            page.getByRole('button', {
                name: 'Quitar multivaluado del compuesto',
            }),
        ).toBeVisible();

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'contacto',
            key: false,
            partialKey: false,
            multivalued: true,
        });

        await page
            .getByRole('button', {
                name: 'Quitar multivaluado del compuesto',
            })
            .click();

        await expect(
            page.getByText('Multivaluado eliminado del atributo').last(),
        ).toBeVisible();

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');
                const attribute = entity?.attributes?.[1];

                return {
                    multivalued: attribute?.multivalued,
                    hasMultivaluedFlag: Object.prototype.hasOwnProperty.call(
                        attribute ?? {},
                        'multivalued',
                    ),
                    childNames: attribute?.children?.map((child) => child.name),
                };
            })
            .toEqual({
                multivalued: undefined,
                hasMultivaluedFlag: false,
                childNames: ['contacto', 'prefijo', 'numero'],
            });
    });

    test('does not allow direct conversion of a simple multivalued entity attribute into a composite attribute', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);
        await renameElement(page, 'Atributo', 'telefonos');

        await page.getByText('telefonos', { exact: true }).click();
        await page.getByRole('button', { name: 'Marcar multivaluado' }).click();

        await expect(
            page.getByText('Atributo marcado como multivaluado').last(),
        ).toBeVisible();

        await expect(
            page.getByRole('button', { name: 'Añadir subatributo hermano' }),
        ).toHaveCount(0);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
            name: 'telefonos',
            key: false,
            partialKey: false,
            multivalued: true,
        });

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');
                return entity?.attributes?.[1]?.children;
            })
            .toBeUndefined();

        await page.reload();

        await expect(page.getByText('telefonos', { exact: true })).toBeVisible();

        await page.getByText('telefonos', { exact: true }).click();

        await expect(
            page.getByRole('button', { name: 'Quitar multivaluado' }),
        ).toBeVisible();

        await expect(
            page.getByRole('button', { name: 'Añadir subatributo hermano' }),
        ).toHaveCount(0);
    });

});

test.describe('composite key semantics', () => {
    test('toggle composite attribute key from any child attribute', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);        

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);
        await renameElement(page, 'Atributo', 'direccion');

        await page.getByText('direccion', { exact: true }).click();
        await page
            .getByRole('button', { name: 'Añadir subatributo hermano' })
            .click();

        await renameElement(page, 'Atributo', 'calle');

        await selectAttributeByName(page, 'Entidad', 'calle');
        await page
            .getByRole('button', { name: 'Añadir subatributo hermano' })
            .click();

        await renameElement(page, 'Atributo', 'ciudad');

        await selectAttributeByName(page, 'Entidad', 'calle');

        await expect(
            page.getByRole('button', { name: 'Convertir en clave' }),
        ).toBeVisible();

        await page.getByRole('button', { name: 'Convertir en clave' }).click();

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');
                const idAttribute = entity?.attributes?.[0];
                const compositeAttribute = entity?.attributes?.[1];

                return {
                    idKey: idAttribute?.key,
                    compositeKey: compositeAttribute?.key,
                    childKeys: compositeAttribute?.children?.map(
                        (attribute) => attribute.key,
                    ),
                    childNames: compositeAttribute?.children?.map(
                        (attribute) => attribute.name,
                    ),
                };
            })
            .toEqual({
                idKey: false,
                compositeKey: true,
                childKeys: [false, false, false],
                childNames: ['direccion', 'calle', 'ciudad'],
            });

        await selectAttributeByName(page, 'Entidad', 'ciudad');

        await expect(
            page.getByRole('button', { name: 'Quitar clave' }),
        ).toBeVisible();
        
        const sql = await exportCurrentSqlScript(page);

        expectSQLToContain(sql, 'PRIMARY KEY (direccion, calle, ciudad)');

        await selectAttributeByName(page, 'Entidad', 'ciudad');

        await expect(
            page.getByRole('button', { name: 'Quitar clave' }),
        ).toBeVisible();

        await page.getByRole('button', { name: 'Quitar clave' }).click();

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');
                const compositeAttribute = entity?.attributes?.[1];

                return {
                    compositeKey: compositeAttribute?.key,
                    childKeys: compositeAttribute?.children?.map(
                        (attribute) => attribute.key,
                    ),
                };
            })
            .toEqual({
                compositeKey: false,
                childKeys: [false, false, false],
            });
            
        await selectAttributeByName(page, 'Entidad', 'calle');

        await expect(
            page.getByRole('button', { name: 'Convertir en clave' }),
        ).toBeVisible();
    });
});

test.describe('SQL export from attribute editor flows', () => {
    test('generate SQL for an editor-created composite multivalued attribute', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);
        await renameElement(page, 'Atributo', 'telefonos');
        await page.getByText('telefonos', { exact: true }).click();

        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();
        await renameElement(page, 'Atributo', 'prefijo');

        await selectAttributeByName(page, 'Entidad', 'telefonos');
        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();
        await renameElement(page, 'Atributo', 'numero');

        await page.getByText('telefonos', { exact: true }).click();

        await expect(
            page.getByRole('button', {
                name: 'Marcar compuesto como multivaluado',
            }),
        ).toBeVisible();

        await page
            .getByRole('button', {
                name: 'Marcar compuesto como multivaluado',
            })
            .click();

        await expect(
            page.getByText('Atributo marcado como multivaluado').last(),
        ).toBeVisible();

        const sql = await exportCurrentSqlScript(page);

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad (
            id VARCHAR(40) PRIMARY KEY
            );
            `,
        );

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Entidad_telefonos (
            id VARCHAR(40) REFERENCES Entidad ON DELETE CASCADE ON UPDATE CASCADE,
            telefonos VARCHAR(40),
            prefijo VARCHAR(40),
            numero VARCHAR(40),
            PRIMARY KEY (id, telefonos, prefijo, numero)
            );
            `,
        );

        expect(sql).not.toContain('prefijo VARCHAR(40) PRIMARY KEY');
        expect(sql).not.toContain('numero VARCHAR(40) PRIMARY KEY');
    });

    test('generated SQL ignores hidden composite connector names', async ({ page }) => {
        const diagram = {
            entities: [
                {
                    idMx: 'entity-cliente',
                    name: 'Cliente',
                    position: { x: 180, y: 180 },
                    weak: false,
                    ownerEntityId: null,
                    identifyingRelationId: null,
                    attributes: [
                        {
                            idMx: 'attr-internal-connector',
                            name: 'internal_direccion_connector',
                            position: { x: 300, y: 180 },
                            key: true,
                            partialKey: false,
                            cell: [
                                'attr-internal-connector',
                                'edge-internal-connector',
                            ],
                            offsetX: 120,
                            offsetY: 0,
                            children: [
                                {
                                    idMx: 'attr-calle',
                                    name: 'calle',
                                    position: { x: 420, y: 150 },
                                    key: false,
                                    partialKey: false,
                                    cell: ['attr-calle', 'edge-calle'],
                                    offsetX: 120,
                                    offsetY: -30,
                                },
                                {
                                    idMx: 'attr-ciudad',
                                    name: 'ciudad',
                                    position: { x: 420, y: 210 },
                                    key: false,
                                    partialKey: false,
                                    cell: ['attr-ciudad', 'edge-ciudad'],
                                    offsetX: 120,
                                    offsetY: 30,
                                },
                            ],
                        },
                    ],
                },
            ],
            relations: [],
        }

        await seedSavedDiagram(page, diagram)

        await page.goto('/')

        const sql = await exportCurrentSqlScript(page)

        expectSQLToContain(
            sql,
            `
            CREATE TABLE Cliente (
            calle VARCHAR(40),
            ciudad VARCHAR(40),
            PRIMARY KEY (calle, ciudad)
            );
            `,
        )

        expect(sql).not.toContain('internal_direccion_connector')
    })

});

test.describe('composite attribute interactions', () => {
    test('add sibling subattributes without creating nested subattributes', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);
        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await renameElement(page, 'Atributo', 'codigo');

        await page.getByText('codigo', { exact: true }).click();
        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();

        await expect(
            page.getByText('Subatributo hermano insertado').last(),
        ).toBeVisible();

        await renameElement(page, 'Atributo', 'serie');

        await page.getByText('serie', { exact: true }).click();
        await page.getByRole('button', { name: 'Añadir subatributo hermano' }).click();

        await renameElement(page, 'Atributo', 'numero');

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');
                const compositeAttribute = findRootAttributeByName(entity, 'codigo');

                return {
                    childNames: compositeAttribute?.children?.map(
                        (attribute) => attribute.name,
                    ),
                    nestedChildren: compositeAttribute?.children?.some(
                        (attribute) => Array.isArray(attribute.children),
                    ),
                };
            })
            .toEqual({
                childNames: ['codigo', 'serie', 'numero'],
                nestedChildren: false,
            });
    });

    test('move composite attribute branch from its root edge', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);
        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await renameElement(page, 'Atributo', 'direccion');

        await page.getByText('direccion', { exact: true }).click();
        await page
            .getByRole('button', { name: 'Añadir subatributo hermano' })
            .click();

        await renameElement(page, 'Atributo', 'calle');

        await selectAttributeByName(page, 'Entidad', 'calle');
        await page
            .getByRole('button', { name: 'Añadir subatributo hermano' })
            .click();

        await renameElement(page, 'Atributo', 'ciudad');

        const initialPositions = await getSavedEntity(page, 'Entidad').then(
            (entity) => {
                const compositeAttribute = findRootAttributeByName(entity, 'direccion');

                return {
                    root: compositeAttribute.position,
                    children: compositeAttribute.children.map((child) => ({
                        name: child.name,
                        position: child.position,
                    })),
                };
            },
        );

        await dragCompositeAttributeRootEdge(page, 'Entidad', 'direccion', 60, 40);

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');
                const compositeAttribute = findRootAttributeByName(entity, 'direccion');

                return {
                    rootMovedRight:
                        compositeAttribute?.position?.x >
                        initialPositions.root.x,
                    rootMovedDown:
                        compositeAttribute?.position?.y >
                        initialPositions.root.y,
                    childNames: compositeAttribute?.children?.map(
                        (child) => child.name,
                    ),
                    childrenMovedRight: compositeAttribute?.children?.every(
                        (child, index) =>
                            child.position.x >
                            initialPositions.children[index].position.x,
                    ),
                    childrenMovedDown: compositeAttribute?.children?.every(
                        (child, index) =>
                            child.position.y >
                            initialPositions.children[index].position.y,
                    ),
                };
            })
            .toEqual({
                rootMovedRight: true,
                rootMovedDown: true,
                childNames: ['direccion', 'calle', 'ciudad'],
                childrenMovedRight: true,
                childrenMovedDown: true,
            });
    });

    test('do not select composite connector directly', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);
        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);

        await renameElement(page, 'Atributo', 'direccion');

        await page.getByText('direccion', { exact: true }).click();
        await page
            .getByRole('button', { name: 'Añadir subatributo hermano' })
            .click();

        await renameElement(page, 'Atributo', 'calle');

        await clearGraphSelection(page);

        await expect(
            page.getByRole('button', { name: 'Añadir subatributo hermano' }),
        ).toHaveCount(0);

        await clickCompositeAttributeConnector(page, 'Entidad', 'direccion');

        await expect(
            page.getByRole('button', { name: 'Añadir subatributo hermano' }),
        ).toHaveCount(0);

        await expect(
            page.getByRole('button', { name: 'Convertir en clave' }),
        ).toHaveCount(0);
    });

    test('group selected simple entity attributes into a composite attribute', async ({ page }) => {
        await page.goto('/');

        await addEntity(page);

        await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
            name: 'id',
            key: true,
            partialKey: false,
        });

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);
        await renameElement(page, 'Atributo', 'calle');

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');

                return entity?.attributes?.some(
                    (attribute) =>
                        attribute.name === 'calle' && Boolean(attribute.idMx),
                );
            })
            .toBe(true);

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);
        await renameElement(page, 'Atributo', 'numero');

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');

                return entity?.attributes?.some(
                    (attribute) =>
                        attribute.name === 'numero' && Boolean(attribute.idMx),
                );
            })
            .toBe(true);

        await selectAttributesByName(page, 'Entidad', ['calle', 'numero']);

        page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('Nombre del atributo compuesto');
            await dialog.accept('direccion');
        });

        await page
            .getByRole('button', { name: 'Agrupar en atributo compuesto' })
            .click();

        await expect(
            page.getByText('Atributos agrupados en un atributo compuesto').last(),
        ).toBeVisible();

        await expect
            .poll(async () => {
                const entity = await getSavedEntity(page, 'Entidad');

                return entity?.attributes?.map((attribute) => ({
                    name: attribute.name,
                    key: attribute.key,
                    partialKey: attribute.partialKey,
                    childNames: attribute.children?.map((child) => child.name),
                }));
            })
            .toEqual([
                {
                    name: 'id',
                    key: true,
                    partialKey: false,
                    childNames: undefined,
                },
                {
                    name: 'direccion',
                    key: false,
                    partialKey: false,
                    childNames: ['calle', 'numero'],
                },
            ]);
    });
});