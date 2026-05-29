import { test, expect } from '@playwright/test';
import { buildSQLAssertions } from '../helpers/sqlAssertions';

import {
    addIsa,
    configureIsaHierarchy,
    enableMxGraphDebug,
    expectSavedDiagramState,
    selectEntity,
    addAttributeToSelectedEntity,
    expectSavedEntityAttributeToMatch,
    selectAttributeByName,
} from '../helpers/canvas';

import {
    exportCurrentDiagram,
    exportCurrentSqlScript,
    importDiagram,
    resetDiagram,
    seedSavedDiagram,
    setSavedDiagram,
} from '../helpers/persistence';

const { expectSQLToContain } = buildSQLAssertions(expect);

const createValidIsaDiagram = () => ({
    entities: [
        {
            idMx: 'entity-persona',
            name: 'Persona',
            position: { x: 330, y: 150 },
            weak: false,
            ownerEntityId: null,
            identifyingRelationId: null,
            attributes: [
                {
                    idMx: 'attr-id-persona',
                    name: 'id_persona',
                    position: { x: 440, y: 90 },
                    key: true,
                    partialKey: false,
                    cell: ['attr-id-persona', 'edge-attr-id-persona'],
                    offsetX: 110,
                    offsetY: -60,
                },
                {
                    idMx: 'attr-nombre',
                    name: 'nombre',
                    position: { x: 280, y: 90 },
                    key: false,
                    partialKey: false,
                    cell: ['attr-nombre', 'edge-attr-nombre'],
                    offsetX: -50,
                    offsetY: -60,
                },
            ],
        },
        {
            idMx: 'entity-alumno',
            name: 'Alumno',
            position: { x: 180, y: 400 },
            weak: false,
            ownerEntityId: null,
            identifyingRelationId: null,
            attributes: [
                {
                    idMx: 'attr-expediente',
                    name: 'expediente',
                    position: { x: 170, y: 340 },
                    key: false,
                    partialKey: false,
                    cell: ['attr-expediente', 'edge-attr-expediente'],
                    offsetX: -10,
                    offsetY: -60,
                },
            ],
        },
        {
            idMx: 'entity-profesor',
            name: 'Profesor',
            position: { x: 490, y: 420 },
            weak: false,
            ownerEntityId: null,
            identifyingRelationId: null,
            attributes: [
                {
                    idMx: 'attr-categoria',
                    name: 'categoria',
                    position: { x: 560, y: 350 },
                    key: false,
                    partialKey: false,
                    cell: ['attr-categoria', 'edge-attr-categoria'],
                    offsetX: 70,
                    offsetY: -70,
                },
            ],
        },
    ],
    relations: [],
    isas: [
        {
            idMx: 'isa-persona',
            position: { x: 370, y: 266 },
            generalization: {
                edgeId: 'edge-isa-persona',
                entity: { idMx: 'entity-persona' },
            },
            specializations: [
                {
                    edgeId: 'edge-isa-alumno',
                    entity: { idMx: 'entity-alumno' },
                },
                {
                    edgeId: 'edge-isa-profesor',
                    entity: { idMx: 'entity-profesor' },
                },
            ],
        },
    ],
});

const createIsaBaseDiagram = () => ({
    ...createValidIsaDiagram(),
    isas: [],
});

test.beforeEach(async ({ page }) => {
    await enableMxGraphDebug(page);
});

test('configure an ISA hierarchy from the editor and persist it after reload', async ({
    page,
}) => {
    await page.goto('/');

    await setSavedDiagram(page, createIsaBaseDiagram());

    await page.reload();

    await expect(page.getByText('Persona', { exact: true })).toBeVisible();
    await expect(page.getByText('Alumno', { exact: true })).toBeVisible();
    await expect(page.getByText('Profesor', { exact: true })).toBeVisible();

    await addIsa(page, { x: 370, y: 270 });

    await configureIsaHierarchy(page, 'Persona', ['Alumno', 'Profesor']);

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const persona = diagram.entities.find(
                (entity) => entity.name === 'Persona',
            );
            const alumno = diagram.entities.find(
                (entity) => entity.name === 'Alumno',
            );
            const profesor = diagram.entities.find(
                (entity) => entity.name === 'Profesor',
            );
            const isa = diagram.isas[0];

            return {
                generalizationId: isa?.generalization?.entity?.idMx,
                specializationIds: isa?.specializations?.map(
                    (specialization) => specialization.entity.idMx,
                ),
                hasGeneralizationEdge: Boolean(isa?.generalization?.edgeId),
                hasSpecializationEdges: isa?.specializations?.every(
                    (specialization) => Boolean(specialization.edgeId),
                ),
                expectedGeneralization:
                    isa?.generalization?.entity?.idMx === persona?.idMx,
                expectedSpecializations:
                    isa?.specializations
                        ?.map((specialization) => specialization.entity.idMx)
                        .sort()
                        .join(',') ===
                    [alumno?.idMx, profesor?.idMx].sort().join(','),
            };
        },
        {
            generalizationId: expect.any(String),
            specializationIds: expect.any(Array),
            hasGeneralizationEdge: true,
            hasSpecializationEdges: true,
            expectedGeneralization: true,
            expectedSpecializations: true,
        },
    );

    await page.reload();

    await expect(page.getByText('Persona', { exact: true })).toBeVisible();
    await expect(page.getByText('Alumno', { exact: true })).toBeVisible();
    await expect(page.getByText('Profesor', { exact: true })).toBeVisible();

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const isa = diagram.isas[0];

            return {
                hasIsa: Boolean(isa),
                hasGeneralization: Boolean(
                    isa?.generalization?.entity?.idMx,
                ),
                specializationCount: isa?.specializations?.length,
                hasGeneralizationEdge: Boolean(isa?.generalization?.edgeId),
                hasSpecializationEdges: isa?.specializations?.every(
                    (specialization) => Boolean(specialization.edgeId),
                ),
            };
        },
        {
            hasIsa: true,
            hasGeneralization: true,
            specializationCount: 2,
            hasGeneralizationEdge: true,
            hasSpecializationEdges: true,
        },
    );
});

test('export and import preserve ISA hierarchy structure', async ({ page }) => {
    await seedSavedDiagram(page, createValidIsaDiagram());

    await page.goto('/');

    const exportedDiagram = await exportCurrentDiagram(page);

    await resetDiagram(page);

    await expectSavedDiagramState(
        page,
        (diagram) => ({
            entityCount: diagram.entities.length,
            isaCount: diagram.isas.length,
        }),
        {
            entityCount: 0,
            isaCount: 0,
        },
    );

    await importDiagram(page, exportedDiagram);

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const persona = diagram.entities.find(
                (entity) => entity.name === 'Persona',
            );
            const alumno = diagram.entities.find(
                (entity) => entity.name === 'Alumno',
            );
            const profesor = diagram.entities.find(
                (entity) => entity.name === 'Profesor',
            );
            const isa = diagram.isas[0];

            return {
                entityCount: diagram.entities.length,
                isaCount: diagram.isas.length,
                generalizationId: isa?.generalization?.entity?.idMx,
                specializationIds: isa?.specializations?.map(
                    (specialization) => specialization.entity.idMx,
                ),
                expectedGeneralization:
                    isa?.generalization?.entity?.idMx === persona?.idMx,
                expectedSpecializations:
                    isa?.specializations
                        ?.map((specialization) => specialization.entity.idMx)
                        .sort()
                        .join(',') ===
                    [alumno?.idMx, profesor?.idMx].sort().join(','),
            };
        },
        {
            entityCount: 3,
            isaCount: 1,
            generalizationId: 'entity-persona',
            specializationIds: ['entity-alumno', 'entity-profesor'],
            expectedGeneralization: true,
            expectedSpecializations: true,
        },
    );
});

test('generate SQL from a reconstructed ISA diagram', async ({ page }) => {
    await seedSavedDiagram(page, createValidIsaDiagram());

    await page.goto('/');

    await expect(page.getByText('Persona', { exact: true })).toBeVisible();
    await expect(page.getByText('Alumno', { exact: true })).toBeVisible();
    await expect(page.getByText('Profesor', { exact: true })).toBeVisible();
    await expect(page.getByText('ISA', { exact: true })).toBeVisible();

    const sql = await exportCurrentSqlScript(page);

    expectSQLToContain(
        sql,
        `
        CREATE TABLE Persona (
          id_persona VARCHAR(40) PRIMARY KEY,
          nombre VARCHAR(40)
        );
        `,
    );

    expectSQLToContain(
        sql,
        `
        CREATE TABLE Alumno (
          id_persona VARCHAR(40) PRIMARY KEY,
          expediente VARCHAR(40)
        );
        `,
    );

    expectSQLToContain(
        sql,
        `
        ALTER TABLE Alumno
        ADD CONSTRAINT FK_Alumno_Persona_isa
        FOREIGN KEY (id_persona)
        REFERENCES Persona(id_persona);
        `,
    );

    expectSQLToContain(
        sql,
        `
        CREATE TABLE Profesor (
          id_persona VARCHAR(40) PRIMARY KEY,
          categoria VARCHAR(40)
        );
        `,
    );

    expectSQLToContain(
        sql,
        `
        ALTER TABLE Profesor
        ADD CONSTRAINT FK_Profesor_Persona_isa
        FOREIGN KEY (id_persona)
        REFERENCES Persona(id_persona);
        `,
    );
});

test('deleting an entity participating in an ISA clears the hierarchy configuration', async ({
    page,
}) => {
    await seedSavedDiagram(page, createValidIsaDiagram());

    await page.goto('/');

    await expect(page.getByText('Persona', { exact: true })).toBeVisible();
    await expect(page.getByText('Alumno', { exact: true })).toBeVisible();
    await expect(page.getByText('Profesor', { exact: true })).toBeVisible();
    await expect(page.getByText('ISA', { exact: true })).toBeVisible();

    await selectEntity(page, 'Alumno');
    await page.getByRole('button', { name: 'Borrar' }).click();

    await expectSavedDiagramState(
        page,
        (diagram) => {
            const isa = diagram.isas[0];

            return {
                alumnoExists: diagram.entities.some(
                    (entity) => entity.name === 'Alumno',
                ),
                generalizationId: isa?.generalization?.entity?.idMx ?? '',
                generalizationEdgeId: isa?.generalization?.edgeId ?? '',
                specializationCount: isa?.specializations?.length ?? 0,
            };
        },
        {
            alumnoExists: false,
            generalizationId: '',
            generalizationEdgeId: '',
            specializationCount: 0,
        },
    );
});

test('adding the first own attribute to an ISA specialization does not create a primary key', async ({
    page,
}) => {
    const diagram = createValidIsaDiagram();
    const profesor = diagram.entities.find(
        (entity) => entity.idMx === 'entity-profesor',
    );
    profesor.attributes = [];

    await seedSavedDiagram(page, diagram);
    await page.goto('/');

    await selectEntity(page, 'Profesor');
    await addAttributeToSelectedEntity(page);

    await expectSavedEntityAttributeToMatch(page, 'Profesor', 0, {
        name: 'Atributo',
        key: false,
        partialKey: false,
    });
});

test('does not offer primary key conversion for ISA specialization attributes', async ({
    page,
}) => {
    await seedSavedDiagram(page, createValidIsaDiagram());

    await page.goto('/');

    await selectAttributeByName(page, 'Persona', 'nombre');

    await expect(
        page.getByRole('button', { name: 'Convertir en clave' }),
    ).toBeVisible();

    await selectAttributeByName(page, 'Alumno', 'expediente');

    await expect(
        page.getByRole('button', { name: 'Convertir en clave' }),
    ).toBeHidden();
});