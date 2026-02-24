import { test, expect } from '@playwright/test';

test('add entities to the canvas and change name', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator("svg")
    await page.getByRole('img').first().dragTo(canvas);

    await canvas.click();

    await page.getByText('Entidad').first().dblclick();
    await page.keyboard.type('Clientes');

    await canvas.click();
});

test('add attributes to an entity', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator("svg")
    await page.getByRole('img').first().dragTo(canvas);

    await canvas.click();

    await page.getByText('Entidad').first().dblclick();
    await page.getByText('Añadir atributo').first().click();

    await page.getByText('Atributo', {exact: true}).first().dblclick();
    await page.keyboard.type('Clave');
    await canvas.click();

    // Añadir un atributo secundario
    await page.getByText('Entidad').first().dblclick();
    await page.getByText('Añadir atributo').first().click();
});

test('hide/show attributes', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator("svg");
    await page.getByRole('img').first().dragTo(canvas);
    await canvas.click();

    // Add a primary attribute
    await page.getByText('Entidad').first().dblclick();
    await page.getByText('Añadir atributo').first().click();

    await page.getByText('Atributo', {exact: true}).first().dblclick();
    await page.keyboard.type('Clave');
    await canvas.click();

    await page.getByText('Entidad').first().dblclick();

    // Hide attributes
    await page.getByText('Ocultar atributos', {exact: true}).first().click();
    await page.waitForTimeout(1000); // Wait for 1 second after hiding attributes

    // Check if the added attribute is hidden
    await expect(page.getByText('Clave', {exact: true}).first()).not.toBeAttached()

    // Show attributes
    await page.getByText('Mostrar atributos', {exact: true}).first().click();
    await page.waitForTimeout(1000); // Wait for 2 seconds after showing attributes to ensure changes take effect

    // Check if the added attribute is shown
    await expect(page.getByText('Clave', {exact: true}).first()).toBeAttached()
});

test('mxGraph transaction level stays balanced (updateLevel === 0)', async ({ page }) => {
    // Enable the app debug hook for Playwright
    await page.addInitScript(() => {
        window.__PW__ = true;
    });

    await page.goto('/');

    const canvas = page.locator('svg');

    const getUpdateLevel = async () =>
        page.evaluate(() => window.__DEBUG_GRAPH__?.getModel()?.updateLevel ?? null);

    // After initial setup/config, must not be inside an mxGraph transaction
    await expect(await getUpdateLevel()).toBe(0);

    // Typical operations (same style as existing tests)
    await page.getByRole('img').first().dragTo(canvas);
    await canvas.click();

    await page.getByText('Entidad').first().dblclick();
    await page.keyboard.type('Clientes');
    await canvas.click();

    // Must still be balanced after interactions
    await expect(await getUpdateLevel()).toBe(0);
});

test('reconfigure relationship: Accept disabled/enabled in both configurations (issue 8)', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('svg');
    const entidadIcono = page.locator('img[src="images/rectangle.png"]');
    const relacionIcono = page.locator('img[src="images/rhombus.png"]');

    // 1) Create 2 entities + 1 relationship
    await entidadIcono.dragTo(canvas);
    await entidadIcono.dragTo(canvas);
    await relacionIcono.dragTo(canvas);

    // Helper to open the configuration modal with the relationship selected
    const openConfigDialog = async () => {
        await page.getByText('Relación', { exact: true }).click();
        await page.getByRole('button', { name: 'Configurar relación' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('Configurar relación')).toBeVisible();
        return dialog;
    };

    // Helper to select sides and verify Accept button disabled/enabled state
    const configureSides = async (side1Name, side2Name) => {
        const dialog = page.getByRole('dialog');
        const aceptarBtn = dialog.getByRole('button', { name: 'Aceptar' });

        // When the dialog opens, it must always be disabled (side1/side2 start as "")
        await expect(aceptarBtn).toBeDisabled();

        // Select side 1
        await dialog.locator('#side1').click();
        await page.getByRole('option', { name: side1Name, exact: true }).click();

        // It must still be disabled because side 2 is not selected yet
        await expect(aceptarBtn).toBeDisabled();

        // Select side 2
        await dialog.locator('#side2').click();
        await page.getByRole('option', { name: side2Name, exact: true }).click();

        // Now it must be enabled
        await expect(aceptarBtn).toBeEnabled();

        await aceptarBtn.click();
        await expect(dialog).toBeHidden();
    };

    // 2) First configuration: Entidad -> Entidad 1
    await openConfigDialog();
    await configureSides('Entidad', 'Entidad 1');

    // Quick functional check: two cardinality labels should be created
    await expect(page.getByText('X:X', { exact: true })).toHaveCount(2);

    // 3) Reconfiguration: reopen and swap sides (Entidad 1 -> Entidad)
    await openConfigDialog();
    await configureSides('Entidad 1', 'Entidad');

    // After reconfiguration, there should still be two cardinalities (old ones removed and recreated)
    await expect(page.getByText('X:X', { exact: true })).toHaveCount(2);
});