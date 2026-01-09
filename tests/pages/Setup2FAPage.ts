import { BasePage } from './BasePage';
import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import { CoreLibrary } from '@core';
import { authenticator } from 'otplib';

export class Setup2FAPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'setup2fa';
  }

  async fillSetupOTP(otp: string): Promise<void> {
    await this.qe.ui.fill(this.locator('otpInput'), otp);
  }

  async submitSetup(): Promise<void> {
    await this.qe.ui.click(this.locator('submitButton'));
  }

  async setupWithSecret(secret: string): Promise<void> {
    authenticator.options = {
      step: 30,
      window: 1
    };

    if (!this.validateSecret(secret)) {
      CoreLibrary.log.err(`Invalid secret format: ${secret}. Secret must be base32 encoded string (A-Z, 2-7, optional padding with =).`);
      throw new Error(`Invalid secret format: ${secret}`);
    }

    const otp = authenticator.generate(secret);
    CoreLibrary.log.debug(`[Setup2FAPage] Generated OTP for first time setup: ${otp}`);

    await this.fillSetupOTP(otp);
    await this.submitSetup();
    await this.page.waitForTimeout(2000);

    await this.handleBackupCodes().catch(() => {
      CoreLibrary.log.debug('[Setup2FAPage] No backup codes displayed or already handled');
    });

    await this.page.waitForLoadState('networkidle');

    const pathname = await this.waitForPathnameChange(['/setup-2fa']);
    const currentUrl = this.page.url();


    if (pathname === '/lobby/dashboard' || pathname.startsWith('/lobby/')) {
      CoreLibrary.log.debug(`[Setup2FAPage] First time 2FA setup completed successfully. Redirected to: ${currentUrl}`);
      return;
    }

    if (pathname.includes('/trial/') && pathname.includes('/dashboard')) {
      CoreLibrary.log.debug(`[Setup2FAPage] First time 2FA setup completed successfully. Redirected to trial dashboard: ${currentUrl}`);
      return;
    }

    if (pathname === '/account-locked' || currentUrl.includes('/account-locked')) {
      CoreLibrary.log.err(`[Setup2FAPage] Account locked after 2FA setup. Current URL: ${currentUrl}`);
      throw new Error('Account locked after 2FA setup. Cannot proceed.');
    }

    CoreLibrary.log.err(`[Setup2FAPage] Failed to redirect to dashboard. Current URL: ${currentUrl}, pathname: ${pathname}`);
    throw new Error(`First time 2FA setup failed to redirect. Current URL: ${currentUrl}`);
  }

  async extractSecretFromQRCode(): Promise<string> {
    throw new Error('QR code extraction not yet implemented. Secret must be provided from /auth/2fa/secret endpoint.');
  }

  async handleBackupCodes(): Promise<void> {
    const doneButtonLocator = this.locator('doneButton');
    const doneButton = this.page.locator(doneButtonLocator);
    const isVisible = await doneButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      CoreLibrary.log.debug('[Setup2FAPage] Backup codes displayed. Clicking "Done" to continue...');
      await this.qe.ui.click(doneButtonLocator);
    } else {
      CoreLibrary.log.debug('[Setup2FAPage] No backup codes displayed. Setup may have completed directly.');
    }
  }

  private validateSecret(secret: string): boolean {
    const base32Regex = /^[A-Z2-7]+=*$/;
    return base32Regex.test(secret);
  }

  async isOnSetupPage(): Promise<boolean> {
    const currentUrl = this.page.url();
    const pathname = new URL(currentUrl).pathname;
    return pathname === '/setup-2fa';
  }

  async hasError(): Promise<boolean> {
    const errorElement = this.page.locator(this.locator('errorMessage'));
    const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);
    return hasError;
  }
}
