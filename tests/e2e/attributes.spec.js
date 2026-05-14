import { test, expect } from '@playwright/test';
import { buildSQLAssertions } from '../helpers/sqlAssertions';

import {
    addAttributeToSelectedEntity,
    addEntity,
    enableMxGraphDebug,
    expectAttributeCellVisible,
    expectSavedEntityAttributeToMatch,
    getSavedEntity,
    selectAttributeByName,
    selectEntity,
    renameElement,
} from '../helpers/canvas';

import { exportCurrentSqlScript, seedSavedDiagram } from '../helpers/persistence';

const { expectSQLToContain } = buildSQLAssertions(expect);

test.beforeEach(async ({ page }) => {
    await enableMxGraphDebug(page);
});

test('add attributes to an entity', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');

    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
    });

    await renameElement(page, 'Atributo', 'Clave');

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Clave',
    });

    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
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
    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: true,
        partialKey: false,
    });

    await page.getByText('Atributo', { exact: true }).click();

    await page.getByRole('button', { name: 'Quitar clave' }).click();

    await expect(
        page.getByText('Clave eliminada del atributo').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: false,
        partialKey: false,
    });

    await page.getByRole('button', { name: 'Convertir en clave' }).click();

    await expect(
        page.getByText('Atributo marcado como clave').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: true,
        partialKey: false,
    });
});

test('toggle discriminant on an entity attribute', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: true,
        partialKey: false,
    });

    // Convert the entity into a weak entity.
    // The previous primary key should become the discriminator.
    await selectEntity(page, 'Entidad');

    await page
        .getByRole('button', { name: 'Marcar como entidad débil' })
        .click();

    await expect(
        page.getByText('Entidad marcada como débil').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
        key: false,
        partialKey: true,
    });

    await page.getByText('Atributo', { exact: true }).click();

    await page
        .getByRole('button', { name: 'Quitar discriminante' })
        .click();

    await expect(
        page.getByText('Discriminante eliminado').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'Atributo',
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
        name: 'Atributo',
        key: false,
        partialKey: true,
    });
});

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
    await page.getByRole('button', { name: 'Añadir subatributo' }).click();

    await expect(page.getByText('Subatributo insertado').last()).toBeVisible();
    await expect(page.getByText('Atributo', { exact: true })).toBeVisible();

    await renameElement(page, 'Atributo', 'serie');

    await expect
        .poll(async () => {
            const entity = await getSavedEntity(page, 'Entidad');

            return entity?.attributes?.[0]?.children?.map(
                (attribute) => attribute.name,
            );
        })
        .toEqual(['serie']);
});

test('create a composite attribute with multiple child attributes from the editor', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await renameElement(page, 'Atributo', 'codigo');

    await page.getByText('codigo', { exact: true }).click();

    await page.getByRole('button', { name: 'Añadir subatributo' }).click();
    await renameElement(page, 'Atributo', 'serie');

    await selectAttributeByName(page, 'Entidad', 'codigo');

    await page.getByRole('button', { name: 'Añadir subatributo' }).click();
    await renameElement(page, 'Atributo', 'numero');

    await expect
        .poll(async () => {
            const entity = await getSavedEntity(page, 'Entidad');

            return entity?.attributes?.[0];
        })
        .toMatchObject({
            name: 'codigo',
            key: true,
            children: [
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

    await expect(page.getByText('codigo', { exact: true })).toHaveCount(0);
    await expectAttributeCellVisible(page, 'Entidad', 'codigo', true);
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
    await page.getByRole('button', { name: 'Añadir subatributo' }).click();

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

            return entity?.attributes?.[0];
        })
        .toEqual(
            expect.not.objectContaining({
                children: expect.any(Array),
            }),
        );
});

test('toggle simple multivalued attributes and persist across reloads', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');

    await addAttributeToSelectedEntity(page);

    await page.getByText('Atributo', { exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Marcar multivaluado' }),
    ).toHaveCount(0);

    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
        name: 'Atributo 1',
        key: false,
        partialKey: false,
    });

    await page.getByText('Atributo 1', { exact: true }).click();

    await page.getByRole('button', { name: 'Marcar multivaluado' }).click();

    await expect(
        page.getByText('Atributo marcado como multivaluado').last(),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
        name: 'Atributo 1',
        key: false,
        partialKey: false,
        multivalued: true,
    });

    await expect(
        page.getByRole('button', { name: 'Quitar multivaluado' }),
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: 'Añadir subatributo' }),
    ).toBeVisible();

    await page.reload();

    await expect(page.getByText('Atributo 1', { exact: true })).toBeVisible();

    await page.getByText('Atributo 1', { exact: true }).click();

    await expect(
        page.getByRole('button', { name: 'Quitar multivaluado' }),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
        name: 'Atributo 1',
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
            const attribute = entity?.attributes?.[1];

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
    await selectEntity(page, 'Entidad');

    await addAttributeToSelectedEntity(page);
    await renameElement(page, 'Atributo', 'id');

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 0, {
        name: 'id',
        key: true,
        partialKey: false,
    });

    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);

    await renameElement(page, 'Atributo', 'contacto');

    await page.getByText('contacto', { exact: true }).click();
    await page.getByRole('button', { name: 'Añadir subatributo' }).click();

    await renameElement(page, 'Atributo', 'prefijo');

    await selectAttributeByName(page, 'Entidad', 'contacto');
    await page.getByRole('button', { name: 'Añadir subatributo' }).click();

    await renameElement(page, 'Atributo', 'numero');

    await selectAttributeByName(page, 'Entidad', 'contacto');
    await page.getByRole('button', { name: 'Marcar multivaluado' }).click();

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
        page.getByRole('button', { name: 'Quitar multivaluado' }),
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: 'Añadir subatributo' }),
    ).toBeVisible();

    await page.reload();

    await expect(page.getByText('contacto', { exact: true })).toHaveCount(0);
    await expectAttributeCellVisible(page, 'Entidad', 'contacto', true);
    await expect(page.getByText('prefijo', { exact: true })).toBeVisible();
    await expect(page.getByText('numero', { exact: true })).toBeVisible();

    await selectAttributeByName(page, 'Entidad', 'contacto');

    await expect(
        page.getByRole('button', { name: 'Quitar multivaluado' }),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
        name: 'contacto',
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
            childNames: ['prefijo', 'numero'],
        });
});

test('add child attributes to a simple multivalued entity attribute', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');

    await addAttributeToSelectedEntity(page);
    await renameElement(page, 'Atributo', 'id');

    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);
    await renameElement(page, 'Atributo', 'telefonos');

    await page.getByText('telefonos', { exact: true }).click();
    await page.getByRole('button', { name: 'Marcar multivaluado' }).click();

    await expect(
        page.getByText('Atributo marcado como multivaluado').last(),
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: 'Añadir subatributo' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Añadir subatributo' }).click();

    await expect(page.getByText('Subatributo insertado').last()).toBeVisible();

    await renameElement(page, 'Atributo', 'prefijo');

    await selectAttributeByName(page, 'Entidad', 'telefonos');
    await page.getByRole('button', { name: 'Añadir subatributo' }).click();

    await renameElement(page, 'Atributo', 'numero');

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
        name: 'telefonos',
        key: false,
        partialKey: false,
        multivalued: true,
        children: [
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

    await page.reload();

    await expect(page.getByText('telefonos', { exact: true })).toHaveCount(0);
    await expectAttributeCellVisible(page, 'Entidad', 'telefonos', true);
    await expect(page.getByText('prefijo', { exact: true })).toBeVisible();
    await expect(page.getByText('numero', { exact: true })).toBeVisible();

    await selectAttributeByName(page, 'Entidad', 'telefonos');

    await expect(
        page.getByRole('button', { name: 'Quitar multivaluado' }),
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: 'Añadir subatributo' }),
    ).toBeVisible();

    await expectSavedEntityAttributeToMatch(page, 'Entidad', 1, {
        name: 'telefonos',
        key: false,
        partialKey: false,
        multivalued: true,
        children: [
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
});

test('generate SQL for an editor-created composite multivalued attribute', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');

    await addAttributeToSelectedEntity(page);
    await renameElement(page, 'Atributo', 'id');

    await selectEntity(page, 'Entidad');
    await addAttributeToSelectedEntity(page);
    await renameElement(page, 'Atributo', 'telefonos');

    await page.getByText('telefonos', { exact: true }).click();
    await page.getByRole('button', { name: 'Marcar multivaluado' }).click();

    await expect(
        page.getByText('Atributo marcado como multivaluado').last(),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Añadir subatributo' }).click();
    await renameElement(page, 'Atributo', 'prefijo');

    await selectAttributeByName(page, 'Entidad', 'telefonos');
    await page.getByRole('button', { name: 'Añadir subatributo' }).click();
    await renameElement(page, 'Atributo', 'numero');

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
          id VARCHAR(40),
          prefijo VARCHAR(40),
          numero VARCHAR(40),
          PRIMARY KEY (id, prefijo, numero)
        );
        `,
    );

    expectSQLToContain(
        sql,
        `
        ALTER TABLE Entidad_telefonos
        ADD CONSTRAINT FK_Entidad_telefonos_Entidad_owner
        FOREIGN KEY (id)
        REFERENCES Entidad(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
        `,
    );

    expect(sql).not.toContain('telefonos VARCHAR(40)');
    expect(sql).not.toContain('prefijo VARCHAR(40) PRIMARY KEY');
    expect(sql).not.toContain('numero VARCHAR(40) PRIMARY KEY');
});