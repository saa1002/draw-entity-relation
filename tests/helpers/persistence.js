import { expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function exportCurrentDiagram(page) {
    const downloadPromise = page.waitForEvent('download');

    await page.getByRole('button', { name: 'Exportar JSON' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
        dialog.getByText('Exportación diagrama en JSON'),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Aceptar' }).click();

    const download = await downloadPromise;
    const savePath = path.join(
        os.tmpdir(),
        `diagram-${Date.now()}-${download.suggestedFilename()}`,
    );

    await download.saveAs(savePath);

    const raw = await fs.readFile(savePath, 'utf8');

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