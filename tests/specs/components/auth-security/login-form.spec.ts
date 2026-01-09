import { test, expect } from '@playwright/test';
import { PlaywrightInstance } from '@core';
import { testStep } from '@playwrightUtils';
import { LoginPage } from '../../../pages/LoginPage';

// Helper to submit login form
async function submitLoginForm(page: any, data: { email: string; password: string }) {
  const qe = PlaywrightInstance.get(page);
  const loginPage = new LoginPage(qe, page);

  await testStep('Navigate to login page', async () => {
    await loginPage.open();
  });

  await testStep('Fill and submit login form', async () => {
    await loginPage.enterEmail(data.email);
    await loginPage.enterPassword(data.password);
    await loginPage.clickSubmit();
  });
}

test.describe('Login Form Component - Data-Driven (YAML)', () => {
  test.beforeEach(async ({ page, context }) => {
    const qe = PlaywrightInstance.get(page);
    await qe.data.setTestData('admin-session');
    page.on('dialog', async (dialog) => await dialog.dismiss());
    await context.clearPermissions();
  });

  test('Login with valid admin-session from YAML @components', async ({ page }) => {
    const qe = PlaywrightInstance.get(page);

    const email = await qe.data.get('email');
    const password = await qe.data.get('password');

    await submitLoginForm(page, { email, password });

    await testStep('Verify redirect to dashboard', async () => {
      await expect(page).toHaveURL(/\/lobby\/dashboard/);
    });
  });
});
