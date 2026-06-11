import { expect } from '@playwright/test';

async function mockSaveFilePicker(page) {
    await page.evaluate(() => {
        window.__E2E_SAVED_FILES__ = window.__E2E_SAVED_FILES__ || [];

        Object.defineProperty(window, 'showSaveFilePicker', {
            configurable: true,
            writable: true,
            value: async (options = {}) => ({
                async createWritable() {
                    const chunks = [];
                    let mimeType = '';
                    let size = 0;

                    return {
                        async write(data) {
                            if (data instanceof Blob) {
                                mimeType = data.type;
                                size += data.size;
                                chunks.push(await data.text());
                                return;
                            }

                            if (typeof data === 'string') {
                                size += data.length;
                                chunks.push(data);
                                return;
                            }

                            if (data instanceof ArrayBuffer) {
                                size += data.byteLength;
                                chunks.push(new TextDecoder().decode(data));
                                return;
                            }

                            const fallbackContent = String(data);

                            size += fallbackContent.length;
                            chunks.push(fallbackContent);
                        },

                        async close() {
                            window.__E2E_SAVED_FILES__.push({
                                fileName: options.suggestedName ?? 'diagram.json',
                                content: chunks.join(''),
                                mimeType,
                                size,
                            });
                        },
                    };
                },
            }),
        });
    });
}


export async function exportCurrentDiagram(page) {
    await mockSaveFilePicker(page);

    const previousExportsCount = await page.evaluate(
        () => window.__E2E_SAVED_FILES__.length,
    );

    await page.getByRole('button', { name: 'Exportar JSON' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
        dialog.getByText('Exportar diagrama en JSON'),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Exportar JSON' }).click();

    await page.waitForFunction(
        (count) => window.__E2E_SAVED_FILES__.length > count,
        previousExportsCount,
    );

    const raw = await page.evaluate(
        () => window.__E2E_SAVED_FILES__.at(-1).content,
    );
    
    return JSON.parse(raw);
}

export async function exportCurrentDiagramImage(page, format = 'PNG') {
    await mockSaveFilePicker(page);

    const previousExportsCount = await page.evaluate(
        () => window.__E2E_SAVED_FILES__.length,
    );

    await page.getByRole('button', { name: 'Exportar imagen' }).click();

    const dialog = page.getByRole('dialog');

    await expect(
        dialog.getByText('Exportar diagrama como imagen'),
    ).toBeVisible();

    if (format !== 'PNG') {
        await dialog.getByLabel('Formato').click();

        const optionsList = page.getByRole('listbox');
        await optionsList.getByRole('option', { name: format }).click();
        await expect(optionsList).toBeHidden();
    }

    await dialog.getByRole('button', { name: 'Exportar imagen' }).click();

    await page.waitForFunction(
        (count) => window.__E2E_SAVED_FILES__.length > count,
        previousExportsCount,
    );

    return page.evaluate(() => window.__E2E_SAVED_FILES__.at(-1));
}

export async function resetDiagram(page) {
    await page.getByRole('button', { name: 'Reiniciar' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Reiniciar diagrama')).toBeVisible();

    await dialog.getByRole('button', { name: 'Reiniciar' }).click();
}

export async function importDiagram(page, diagram, { mode = 'replace' } = {}) {
    await page.getByRole('button', { name: 'Importar JSON' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
        dialog.getByText('Importar diagrama desde JSON'),
    ).toBeVisible();

    if (mode === 'merge') {
        await dialog.locator('#import-json-mode').click();
        await page
            .getByRole('option', { name: 'Combinar con el diagrama actual' })
            .click();
    }

    const input = dialog.locator('input[type="file"]');

    await input.setInputFiles({
        name: 'diagram.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(diagram), 'utf8'),
    });

    await expect(
        page.getByText('Diagrama importado con éxito.').last(),
    ).toBeVisible();
}

export async function seedSavedDiagram(page, diagram) {
    await page.addInitScript((initialDiagram) => {
        window.localStorage.setItem(
            'diagramData',
            JSON.stringify(initialDiagram),
        );
    }, diagram);
}

export async function exportCurrentSqlScript(page) {
    await mockSaveFilePicker(page);

    const previousExportsCount = await page.evaluate(
        () => window.__E2E_SAVED_FILES__.length,
    );

    await page.getByRole('button', { name: 'Generar SQL' }).click();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Generar script SQL')).toBeVisible();

    const acceptButton = dialog.getByRole('button', { name: 'Generar SQL' });

    await expect(acceptButton).toBeEnabled();

    await acceptButton.click();

    await page.waitForFunction(
        (count) => window.__E2E_SAVED_FILES__.length > count,
        previousExportsCount,
    );

    return page.evaluate(
        () => window.__E2E_SAVED_FILES__.at(-1).content,
    );
}

export async function setSavedDiagram(page, diagram) {
    await page.evaluate((diagramToSave) => {
        window.localStorage.setItem(
            'diagramData',
            JSON.stringify(diagramToSave),
        );
    }, diagram);
}