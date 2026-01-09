import { test, expect } from '@playwright/test';
import { PlaywrightInstance } from '@core';
import { testStep } from '@playwrightUtils';
import { TwoFAPage } from '../../../pages/TwoFAPage';

type TwoFATestCase = {
  name: string;
  code: string;
  expectedResult: 'success' | 'failure';
  description: string;
  expectedError?: string;
};

const TWO_FA_TEST_DATA: TwoFATestCase[] = [
  {
    name: 'Valid OTP code',
    code: '123456',
    expectedResult: 'success',
    description: 'Should verify successfully with valid OTP'
  },
  {
    name: 'Invalid OTP code',
    code: '000000',
    expectedResult: 'failure',
    expectedError: 'Invalid code',
    description: 'Should show error with invalid OTP'
  },
  {
    name: 'Expired OTP code',
    code: '999999',
    expectedResult: 'failure',
    expectedError: 'Code expired',
    description: 'Should show error with expired OTP'
  }
];

test.describe('Verify 2FA Block - Data-Driven @components', () => {
  test.beforeEach(async ({ page, context }) => {
    const qe = PlaywrightInstance.get(page);
    await qe.data.setTestData('admin-session');
    page.on('dialog', async (dialog) => await dialog.dismiss());
    await context.clearPermissions();
  });

  for (const testCase of TWO_FA_TEST_DATA) {
    test(`${testCase.name} - ${testCase.description}`, async ({ page }) => {
      const qe = PlaywrightInstance.get(page);
      const twoFAPage = new TwoFAPage(qe, page);

      await testStep('Navigate to verify-2fa page', async () => {
        const baseUrl = qe.envProps.get('baseUrl') || 'http://127.0.0.1:3000';
        await page.goto(`${baseUrl}/verify-2fa`);
        await page.waitForLoadState('networkidle');
      });

      await testStep(`Enter 2FA code: ${testCase.code}`, async () => {
        await twoFAPage.verify(testCase.code);
      });

      if (testCase.expectedResult === 'success') {
        await testStep('Verify successful redirect to dashboard', async () => {
          await expect(page).toHaveURL(/\/lobby\/dashboard/);
        });
      } else {
        await testStep('Verify error message displayed', async () => {
          const errorLocator = page.locator('.error-message');
          await expect(errorLocator).toBeVisible();
          if (testCase.expectedError) {
            await expect(errorLocator).toContainText(testCase.expectedError);
          }
        });
      }
    });
  }
});
