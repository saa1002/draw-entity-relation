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

                    return {
                        async write(data) {
                            if (data instanceof Blob) {
                                chunks.push(await data.text());
                                return;
                            }

                            if (typeof data === 'string') {
                                chunks.push(data);
                                return;
                            }

                            if (data instanceof ArrayBuffer) {
                                chunks.push(new TextDecoder().decode(data));
                                return;
                            }

                            chunks.push(String(data));
                        },

                        async close() {
                            window.__E2E_SAVED_FILES__.push({
                                fileName:
                                    options.suggestedName ?? 'diagram.json',
                                content: chunks.join(''),
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
        dialog.getByText('Exportación diagrama en JSON'),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Aceptar' }).click();

    await page.waitForFunction(
        (count) => window.__E2E_SAVED_FILES__.length > count,
        previousExportsCount,
    );

    const raw = await page.evaluate(
        () => window.__E2E_SAVED_FILES__.at(-1).content,
    );
    
    return JSON.parse(raw);
}

export async function resetDiagram(page) {
    await page.getByRole('button', { name: 'Reiniciar' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Reiniciar diagrama')).toBeVisible();

    await dialog.getByRole('button', { name: 'Aceptar' }).click();
}

export async function importDiagram(page, diagram) {
    await page.getByRole('button', { name: 'Importar JSON' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
        dialog.getByText('Importación de diagrama desde JSON'),
    ).toBeVisible();

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