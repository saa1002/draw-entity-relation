import { test, expect } from '@playwright/test';

import {
    addAttributeToSelectedEntity,
    addEntity,
    addIsa,
    addRelation,
    expectSavedDiagramState,
    getSavedDiagram,
    renameElement,
    selectEntity,
    selectIsa,
    selectRelation,
} from '../helpers/canvas';;

const generateBasicStructure = async (
    page,
    { templateName = 'Relación N:M básica', mode = 'replace' } = {},
) => {
    await page.getByRole('button', { name: 'Generar estructura' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
        dialog.getByText('Generar estructura básica', { exact: true }),
    ).toBeVisible();

    await expect(dialog.locator('#generate-structure-mode')).toBeVisible();

    if (templateName !== 'Relación N:M básica') {
        await dialog.locator('#generate-structure-template').click();

        const optionsList = page.getByRole('listbox');
        await optionsList
            .getByRole('option', { name: templateName, exact: true })
            .click();
        await expect(optionsList).toBeHidden();
    }

    if (mode === 'merge') {
        await dialog.locator('#generate-structure-mode').click();

        const optionsList = page.getByRole('listbox');
        await optionsList
            .getByRole('option', {
                name: 'Combinar con el diagrama actual',
                exact: true,
            })
            .click();
        await expect(optionsList).toBeHidden();
    }

    await dialog.getByRole('button', { name: 'Generar estructura' }).click();

    await expect(
        page.getByText(`Estructura generada: ${templateName}.`).last(),
    ).toBeVisible();
};

test('mxGraph transaction level stays balanced (updateLevel === 0)', async ({ page }) => {
    await page.addInitScript(() => {
        window.__PW__ = true;
    });

    await page.goto('/');

    const getUpdateLevel = async () =>
        page.evaluate(
            () => window.__DEBUG_GRAPH__?.getModel()?.updateLevel ?? null,
        );

    await expect.poll(getUpdateLevel).toBe(0);

    await addEntity(page);
    await renameElement(page, 'Entidad', 'Clientes');

    await expect(page.getByText('Clientes', { exact: true })).toBeVisible();

    await expect.poll(getUpdateLevel).toBe(0);
});

test('shows onboarding message only while the canvas is empty', async ({ page }) => {
    await page.goto('/');

    const onboardingMessage = page.getByText(
        'Añade una entidad para comenzar',
        { exact: true },
    );

    await expect(onboardingMessage).toBeVisible();

    await addEntity(page);

    await expect(onboardingMessage).toBeHidden();
});

test('shows tooltips for draggable ER elements', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('img[src="images/rectangle.png"]')).toHaveAttribute(
        'title',
        'Arrastra para añadir una entidad al diagrama',
    );

    await expect(page.locator('img[src="images/rhombus.png"]')).toHaveAttribute(
        'title',
        'Arrastra para añadir una relación al diagrama',
    );

    await expect(page.locator('img[src="images/triangle.png"]')).toHaveAttribute(
        'title',
        'Arrastra para añadir una ISA al diagrama',
    );
});

test('shows contextual header for selected elements', async ({ page }) => {
    await page.goto('/');

    await addEntity(page);
    await selectEntity(page, 'Entidad');

    await expect(page.getByText('Selección')).toBeVisible();
    await expect(page.getByText('Entidad seleccionada')).toBeVisible();
});

test('shows guidance when no diagram element is selected', async ({ page }) => {
    await page.goto('/');

    const guidance = page.getByText(
        'Selecciona una entidad, relación, atributo o ISA para ver sus acciones disponibles.',
    );

    await expect(guidance).toBeVisible();

    await addEntity(page);
    await expect(guidance).toBeVisible();

    await selectEntity(page, 'Entidad');

    await expect(guidance).toBeHidden();
    await expect(page.getByText('Entidad seleccionada')).toBeVisible();
});

test('validates current diagram and shows success feedback when it is valid', async ({
    page,
}) => {
    await page.goto('/');

    await addEntity(page);

    await page.getByRole('button', { name: 'Comprobar diagrama' }).click();

    await expect(page.getByText('El diagrama es válido.')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('validates current diagram and shows grouped errors when it is invalid', async ({
    page,
}) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Comprobar diagrama' }).click();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Comprobar diagrama')).toBeVisible();
    await expect(
        dialog.getByText(
            'El diagrama no se ha podido comprobar por los siguientes errores:',
        ),
    ).toBeVisible();
    await expect(dialog.getByText('General')).toBeVisible();
    await expect(dialog.getByText('El diagrama está vacío.')).toBeVisible();

    await dialog.getByRole('button', { name: 'Cerrar' }).click();

    await expect(dialog).toBeHidden();
});

test('groups sidebar actions into visual sections', async ({ page }) => {
    await page.goto('/');

    const sectionTitles = page.locator('.sidebar-section-title');

    await expect(
        sectionTitles.filter({ hasText: /^Elementos E\/R$/ }),
    ).toBeVisible();
    await expect(
        sectionTitles.filter({ hasText: /^Historial$/ }),
    ).toBeVisible();
    await expect(
        sectionTitles.filter({ hasText: /^Diagrama$/ }),
    ).toBeVisible();

    await addEntity(page);
    await selectEntity(page, 'Entidad');

    await expect(
        sectionTitles.filter({ hasText: /^Selección$/ }),
    ).toBeVisible();
    await expect(page.getByText('Entidad seleccionada')).toBeVisible();
});

test('marks reset action as destructive in the sidebar', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Reiniciar' })).toHaveClass(
        /button-toolbar-action-danger/,
    );
});

test('shows feedback when fitting an empty diagram view', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Ajustar vista' }).click();

    await expect(
        page.getByText('No hay elementos en el diagrama para ajustar la vista.'),
    ).toBeVisible();

    await expectSavedDiagramState(
        page,
        (diagram) => ({
            entities: diagram.entities.length,
            relations: diagram.relations.length,
            isas: diagram.isas.length,
        }),
        {
            entities: 0,
            relations: 0,
            isas: 0,
        },
    );
});

test('fits current diagram view without changing the saved diagram', async ({
    page,
}) => {
    await page.addInitScript(() => {
        window.__PW__ = true;
    });

    await page.goto('/');

    await addEntity(page);

    await expect
        .poll(() => page.evaluate(() => Boolean(window.__DEBUG_GRAPH__)))
        .toBe(true);

    const savedDiagramBefore = await getSavedDiagram(page);

    await page.evaluate(() => {
        const graph = window.__DEBUG_GRAPH__;
        const view = graph.getView();

        if (typeof view.setScaleAndTranslate === 'function') {
            view.setScaleAndTranslate(0.25, -1000, -1000);
        } else {
            view.setScale(0.25);
            view.setTranslate(-1000, -1000);
        }

        graph.refresh();
    });

    await page.getByRole('button', { name: 'Ajustar vista' }).click();

    await expect(page.getByText('Vista ajustada al diagrama.')).toBeVisible();

    await expect
        .poll(() => page.evaluate(() => window.__DEBUG_GRAPH__.getView().scale))
        .toBeGreaterThan(0.25);

    await expectSavedDiagramState(
        page,
        (diagram) => diagram,
        savedDiagramBefore,
    );
});

test.describe('keyboard deletion', () => {
    test('delete selected entity with Delete key', async ({ page }) => {
        await page.goto('/');

        await addEntity(page, 'Entidad');
        await selectEntity(page, 'Entidad');

        await page.keyboard.press('Delete');

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.entities.map((entity) => entity.name),
            [],
        );
    });

    test('delete selected relation with Delete key', async ({ page }) => {
        await page.goto('/');

        await addRelation(page, 'Relación');
        await selectRelation(page, 'Relación');

        await page.keyboard.press('Delete');

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.relations.map((relation) => relation.name),
            [],
        );
    });

    test('delete selected non-key attribute with Delete key', async ({
        page,
    }) => {
        await page.goto('/');

        await addEntity(page, 'Entidad');

        await selectEntity(page, 'Entidad');
        await addAttributeToSelectedEntity(page);
        await renameElement(page, 'Atributo', 'nombre');

        await page.getByText('nombre', { exact: true }).click();

        await page.keyboard.press('Delete');

        await expectSavedDiagramState(
            page,
            (diagram) =>
                diagram.entities[0].attributes.map(
                    (attribute) => attribute.name,
                ),
            ['id'],
        );
    });

    test('delete selected ISA with Delete key', async ({ page }) => {
        await page.goto('/');

        await addIsa(page);
        await selectIsa(page);

        await page.keyboard.press('Delete');

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.isas.length,
            0,
        );
    });
});

test.describe('undo and redo', () => {
    test('undoes and redoes entity creation using toolbar buttons', async ({
        page,
    }) => {
        await page.goto('/');

        await expect(
            page.getByRole('button', { name: 'Deshacer' }),
        ).toBeDisabled();
        await expect(
            page.getByRole('button', { name: 'Rehacer' }),
        ).toBeDisabled();

        await addEntity(page, 'Entidad');

        await expect(
            page.getByRole('button', { name: 'Deshacer' }),
        ).toBeEnabled();

        await page.getByRole('button', { name: 'Deshacer' }).click();

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.entities.map((entity) => entity.name),
            [],
        );

        await expect(
            page.getByRole('button', { name: 'Rehacer' }),
        ).toBeEnabled();

        await page.getByRole('button', { name: 'Rehacer' }).click();

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.entities.map((entity) => entity.name),
            ['Entidad'],
        );
    });

    test('supports Ctrl+Z and Ctrl+Y for diagram edits', async ({ page }) => {
        await page.goto('/');

        await addEntity(page, 'Entidad');
        await renameElement(page, 'Entidad', 'Clientes');

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.entities.map((entity) => entity.name),
            ['Clientes'],
        );

        await page.keyboard.press('Control+Z');

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.entities.map((entity) => entity.name),
            ['Entidad'],
        );

        await page.keyboard.press('Control+Y');

        await expectSavedDiagramState(
            page,
            (diagram) => diagram.entities.map((entity) => entity.name),
            ['Clientes'],
        );
    });
});

test('generates the default N:M diagram structure', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Generar estructura' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
        dialog.getByText('Generar estructura básica', { exact: true }),
    ).toBeVisible();

    await expect(
        dialog.getByRole('combobox', { name: 'Estructura' }),
    ).toBeVisible();

    await expect(
        dialog.getByText(
            'Crea dos entidades con atributos, una relación N:M entre ellas y un atributo propio de la relación.',
            { exact: true },
        ),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Generar estructura' }).click();

    await expect(
        page.getByText('Estructura generada: Relación N:M básica.').last(),
    ).toBeVisible();

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const firstEntity = diagram.entities.find(
                (entity) => entity.name === 'Entidad',
            );
            const secondEntity = diagram.entities.find(
                (entity) => entity.name === 'Entidad 1',
            );
            const relation = diagram.relations.find(
                (currentRelation) => currentRelation.name === 'Relación',
            );

            return {
                entityNames: diagram.entities.map((entity) => entity.name),
                relationNames: diagram.relations.map(
                    (currentRelation) => currentRelation.name,
                ),
                isaCount: diagram.isas.length,
                firstEntityAttributes: firstEntity?.attributes.map(
                    (attribute) => ({
                        name: attribute.name,
                        key: attribute.key,
                    }),
                ),
                secondEntityAttributes: secondEntity?.attributes.map(
                    (attribute) => ({
                        name: attribute.name,
                        key: attribute.key,
                    }),
                ),
                relationAttributes: relation?.attributes.map(
                    (attribute) => attribute.name,
                ),
                relationCanHoldAttributes: relation?.canHoldAttributes,
                relationCardinalities: [
                    relation?.side1.cardinality,
                    relation?.side2.cardinality,
                ],
            };
        },
        {
            entityNames: ['Entidad', 'Entidad 1'],
            relationNames: ['Relación'],
            isaCount: 0,
            firstEntityAttributes: [
                { name: 'id', key: true },
                { name: 'Atributo 1', key: false },
            ],
            secondEntityAttributes: [
                { name: 'id', key: true },
                { name: 'Atributo 1', key: false },
            ],
            relationAttributes: ['Atributo'],
            relationCanHoldAttributes: true,
            relationCardinalities: ['0:N', '0:N'],
        },
    );

    await page.getByRole('button', { name: 'Generar SQL' }).click();

    const sqlDialog = page.getByRole('dialog');

    await expect(
        sqlDialog.getByText('Generar script SQL', { exact: true }),
    ).toBeVisible();

    await expect(
        sqlDialog.getByRole('button', { name: 'Generar SQL' }),
    ).toBeEnabled();
});

test('allows choosing each basic generated structure template', async ({
    page,
}) => {
    const templates = [
        {
            option: 'Relación N:M básica',
            expected: {
                entityCount: 2,
                relationCount: 1,
                isaCount: 0,
                relationArity: undefined,
                relationCardinalities: ['0:N', '0:N'],
                relationCanHoldAttributes: true,
                relationAttributeCount: 1,
                weakEntityCount: 0,
                identifyingRelationCount: 0,
            },
        },
        {
            option: 'Relación 1:N básica',
            expected: {
                entityCount: 2,
                relationCount: 1,
                isaCount: 0,
                relationArity: undefined,
                relationCardinalities: ['1:1', '0:N'],
                relationCanHoldAttributes: false,
                relationAttributeCount: 0,
                weakEntityCount: 0,
                identifyingRelationCount: 0,
            },
        },
        {
            option: 'Relación 1:1 básica',
            expected: {
                entityCount: 2,
                relationCount: 1,
                isaCount: 0,
                relationArity: undefined,
                relationCardinalities: ['0:1', '0:1'],
                relationCanHoldAttributes: false,
                relationAttributeCount: 0,
                weakEntityCount: 0,
                identifyingRelationCount: 0,
            },
        },
        {
            option: 'Relación ternaria básica',
            expected: {
                entityCount: 3,
                relationCount: 1,
                isaCount: 0,
                relationArity: 3,
                relationCardinalities: ['0:N', '0:N', '0:N'],
                relationCanHoldAttributes: true,
                relationAttributeCount: 1,
                weakEntityCount: 0,
                identifyingRelationCount: 0,
            },
        },
        {
            option: 'Entidad débil básica',
            expected: {
                entityCount: 2,
                relationCount: 1,
                isaCount: 0,
                relationArity: undefined,
                relationCardinalities: ['1:1', '0:N'],
                relationCanHoldAttributes: false,
                relationAttributeCount: 0,
                weakEntityCount: 1,
                identifyingRelationCount: 1,
            },
        },
        {
            option: 'ISA básica',
            expected: {
                entityCount: 3,
                relationCount: 0,
                isaCount: 1,
                relationArity: undefined,
                relationCardinalities: [],
                relationCanHoldAttributes: undefined,
                relationAttributeCount: 0,
                weakEntityCount: 0,
                identifyingRelationCount: 0,
                isaSpecializationCount: 2,
            },
        },
    ];

    for (const template of templates) {
        await page.goto('/');

        await page.getByRole('button', { name: 'Generar estructura' }).click();

        const dialog = page.getByRole('dialog');

        await dialog.getByLabel('Estructura').click();

        const optionsList = page.getByRole('listbox');
        await optionsList.getByRole('option', { name: template.option }).click();
        await expect(optionsList).toBeHidden();

        await dialog
            .getByRole('button', { name: 'Generar estructura' })
            .click();

        await expect(
            page.getByText(`Estructura generada: ${template.option}.`).last(),
        ).toBeVisible();

        await expectSavedDiagramState(
            page,
            (diagram) => {
                const relation = diagram.relations[0];
                const relationCardinalities = relation
                    ? [
                          relation.side1?.cardinality,
                          relation.side2?.cardinality,
                          relation.side3?.cardinality,
                      ].filter(Boolean)
                    : [];

                const weakEntityCount = diagram.entities.filter(
                    (entity) => entity.weak,
                ).length;

                const identifyingRelationCount = diagram.relations.filter(
                    (currentRelation) => currentRelation.isIdentifying,
                ).length;

                const isa = diagram.isas[0];

                return {
                    entityCount: diagram.entities.length,
                    relationCount: diagram.relations.length,
                    isaCount: diagram.isas.length,
                    relationArity: relation?.arity,
                    relationCardinalities,
                    relationCanHoldAttributes: relation?.canHoldAttributes,
                    relationAttributeCount: relation?.attributes.length ?? 0,
                    weakEntityCount,
                    identifyingRelationCount,
                    ...(isa
                        ? { isaSpecializationCount: isa.specializations.length }
                        : {}),
                };
            },
            template.expected,
        );
    }
});

test("allows switching the interface language to English", async ({ page }) => {
    await page.goto("/");

    await expect(
        page.locator(".sidebar-section-title", { hasText: /^Idioma$/ }),
    ).toBeVisible();

    await expect(
        page.getByText("Añade una entidad para comenzar", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "English" }).click();

    await expect(
        page.locator(".sidebar-section-title", { hasText: /^Language$/ }),
    ).toBeVisible();

    await expect(
        page.getByText("Add an entity to get started", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Generate SQL" }).click();

    await expect(
        page.getByText(
            "The SQL script could not be generated because of the following errors:",
            { exact: true },
        ),
    ).toBeVisible();

    await expect(
        page.getByText("The diagram is empty.", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
});

test('generated structure replace mode replaces the current diagram', async ({
    page,
}) => {
    await page.goto('/');

    await addEntity(page);
    await renameElement(page, 'Entidad', 'Actual');

    await expect(page.getByText('Actual', { exact: true })).toBeVisible();

    await generateBasicStructure(page);

    await expect(page.getByText('Actual', { exact: true })).toHaveCount(0);

    await expectSavedDiagramState(
        page,
        (diagram) => ({
            entityNames: diagram.entities.map((entity) => entity.name),
            relationNames: diagram.relations.map((relation) => relation.name),
            isaCount: diagram.isas.length,
        }),
        {
            entityNames: ['Entidad', 'Entidad 1'],
            relationNames: ['Relación'],
            isaCount: 0,
        },
    );
});

test('generated structure merge mode keeps current diagram and renames conflicts', async ({
    page,
}) => {
    await page.goto('/');

    await addEntity(page);

    await generateBasicStructure(page, { mode: 'merge' });

    await expect(page.getByText('Entidad', { exact: true })).toBeVisible();
    await expect(page.getByText('Entidad (1)', { exact: true })).toBeVisible();
    await expect(page.getByText('Entidad 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Relación', { exact: true })).toBeVisible();

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const existingEntity = diagram.entities.find(
                (entity) => entity.name === 'Entidad',
            );
            const mergedFirstEntity = diagram.entities.find(
                (entity) => entity.name === 'Entidad (1)',
            );
            const mergedSecondEntity = diagram.entities.find(
                (entity) => entity.name === 'Entidad 1',
            );
            const mergedRelation = diagram.relations.find(
                (relation) => relation.name === 'Relación',
            );

            return {
                entityNames: diagram.entities.map((entity) => entity.name),
                relationNames: diagram.relations.map(
                    (relation) => relation.name,
                ),
                mergedIdsWereRemapped:
                    mergedFirstEntity?.idMx !== 'template-nm-entity-1' &&
                    mergedSecondEntity?.idMx !== 'template-nm-entity-2' &&
                    mergedRelation?.idMx !== 'template-nm-relation-1',
                mergedRelationTargetsWereRemapped:
                    mergedRelation?.side1?.entity?.idMx ===
                        mergedFirstEntity?.idMx &&
                    mergedRelation?.side2?.entity?.idMx ===
                        mergedSecondEntity?.idMx,
                mergedDiagramWasShifted:
                    mergedFirstEntity?.position?.x >
                    existingEntity?.position?.x,
                relationCardinalities: [
                    mergedRelation?.side1?.cardinality,
                    mergedRelation?.side2?.cardinality,
                ],
                relationAttributes: mergedRelation?.attributes.map(
                    (attribute) => attribute.name,
                ),
            };
        },
        {
            entityNames: ['Entidad', 'Entidad (1)', 'Entidad 1'],
            relationNames: ['Relación'],
            mergedIdsWereRemapped: true,
            mergedRelationTargetsWereRemapped: true,
            mergedDiagramWasShifted: true,
            relationCardinalities: ['0:N', '0:N'],
            relationAttributes: ['Atributo'],
        },
    );
});

test('generated ISA structure can be merged into a valid existing diagram', async ({
    page,
}) => {
    await page.goto('/');

    await addEntity(page);
    await renameElement(page, 'Entidad', 'Auxiliar');

    await generateBasicStructure(page, {
        templateName: 'ISA básica',
        mode: 'merge',
    });

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const isa = diagram.isas[0];
            const generalization = diagram.entities.find(
                (entity) => entity.name === 'Entidad',
            );
            const firstSpecialization = diagram.entities.find(
                (entity) => entity.name === 'Entidad 1',
            );
            const secondSpecialization = diagram.entities.find(
                (entity) => entity.name === 'Entidad 2',
            );

            return {
                entityNames: diagram.entities.map((entity) => entity.name),
                relationCount: diagram.relations.length,
                isaCount: diagram.isas.length,
                isaSpecializationCount: isa?.specializations.length,
                generalizationPrimaryKeys: generalization?.attributes
                    .filter((attribute) => attribute.key)
                    .map((attribute) => attribute.name),
                specializationPrimaryKeyCounts: [
                    firstSpecialization?.attributes.filter(
                        (attribute) => attribute.key,
                    ).length,
                    secondSpecialization?.attributes.filter(
                        (attribute) => attribute.key,
                    ).length,
                ],
                isaReferencesWereRemapped:
                    isa?.generalization?.entity?.idMx ===
                        generalization?.idMx &&
                    isa?.specializations?.[0]?.entity?.idMx ===
                        firstSpecialization?.idMx &&
                    isa?.specializations?.[1]?.entity?.idMx ===
                        secondSpecialization?.idMx,
            };
        },
        {
            entityNames: ['Auxiliar', 'Entidad', 'Entidad 1', 'Entidad 2'],
            relationCount: 0,
            isaCount: 1,
            isaSpecializationCount: 2,
            generalizationPrimaryKeys: ['id'],
            specializationPrimaryKeyCounts: [0, 0],
            isaReferencesWereRemapped: true,
        },
    );

    await page.getByRole('button', { name: 'Comprobar diagrama' }).click();

    await expect(page.getByText('El diagrama es válido.')).toBeVisible();

    await page.getByRole('button', { name: 'Generar SQL' }).click();

    const sqlDialog = page.getByRole('dialog');

    await expect(
        sqlDialog.getByText('Generar script SQL', { exact: true }),
    ).toBeVisible();

    await expect(
        sqlDialog.getByRole('button', { name: 'Generar SQL' }),
    ).toBeEnabled();
});