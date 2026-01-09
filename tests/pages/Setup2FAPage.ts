import { BasePage } from './BasePage';
import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import { CoreLibrary } from '@core';
import { authenticator } from 'otplib';

/**
 * Setup2FAPage - Page object cho first time 2FA setup page
 *
 * Framework Pattern:
 * - Extends BasePage (same as LoginPage, TwoFAPage)
 * - Uses this.locator(key) to get selector string (framework standard)
 * - Uses this.page.locator() for advanced Playwright features (framework standard)
 * - Uses CoreLibrary.log.* for logging (framework standard)
 *
 * Features:
 * - Extract secret from QR code (if needed)
 * - Fill OTP and submit
 * - Handle backup codes display
 */
export class Setup2FAPage extends BasePage {
  // Constructor inherited from BasePage: constructor(qe: IPlaywrightLibrary, page: Page)
  // No need to define explicit constructor
  
  protected getPropertiesFile(): string {
    return 'setup2fa'; // New properties file needed
  }

  /**
   * Fill OTP code for setup verification
   * @param otp - 6-digit OTP code
   */
  async fillSetupOTP(otp: string): Promise<void> {
    await this.qe.ui.fill(this.locator('otpInput'), otp);
  }

  /**
   * Submit setup form
   */
  async submitSetup(): Promise<void> {
    await this.qe.ui.click(this.locator('submitButton'));
  }

  /**
   * Fill OTP, submit, và handle backup codes (full setup flow)
   * @param secret - 2FA secret (base32 format)
   */
  async setupWithSecret(secret: string): Promise<void> {
    // Set otplib options
    authenticator.options = {
      step: 30,
      window: 1
    };

    // Validate secret format
    if (!this.validateSecret(secret)) {
      CoreLibrary.log.err(`Invalid secret format: ${secret}. Secret must be base32 encoded string (A-Z, 2-7, optional padding with =).`);
      throw new Error(`Invalid secret format: ${secret}`);
    }

    const otp = authenticator.generate(secret);
    CoreLibrary.log.debug(`[Setup2FAPage] Generated OTP for first time setup: ${otp}`);

    await this.fillSetupOTP(otp);
    await this.submitSetup();

    await this.page.waitForTimeout(2000); // Wait for response

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

  /**
   * Extract secret from QR code on page
   * TODO: Implement QR code extraction
   * This requires:
   * 1. Find QR code element
   * 2. Extract QR code data URL or image
   * 3. Decode QR code to get secret
   * 
   * @returns Secret string (base32 format)
   */
  async extractSecretFromQRCode(): Promise<string> {
    // TODO: Implement QR code extraction
    // This is a placeholder for future implementation
    throw new Error('QR code extraction not yet implemented. Secret must be provided from /auth/2fa/secret endpoint.');
  }

  /**
   * Handle backup codes display (if shown after setup)
   * TODO: Implement backup codes handling
   * This requires:
   * 1. Wait for backup codes to appear
   * 2. Extract backup codes (optional - for future use)
   * 3. Click "Done" or similar button to continue
   * 
   * Note: Backup codes are displayed after successful setup.
   * We can optionally extract and save them, but for automation,
   * we just need to click "Done" to continue.
   */
  async handleBackupCodes(): Promise<void> {
    // TODO: Implement backup codes handling
    // Check if backup codes are displayed
    // If yes, optionally extract and save them
    // Then click "Done" button to continue
    // Framework Pattern: Use this.page.locator() with this.locator() for visibility check
    // Then use this.qe.ui.click() with locator string directly
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

  /**
   * Validate secret format (base32)
   * @param secret - Secret string
   * @returns true if valid base32 format
   */
  private validateSecret(secret: string): boolean {
    // Base32 format: A-Z, 2-7, optional padding with =
    const base32Regex = /^[A-Z2-7]+=*$/;
    return base32Regex.test(secret);
  }

  /**
   * Check if currently on 2FA setup page
   * @returns true if on /setup-2fa page
   */
  async isOnSetupPage(): Promise<boolean> {
    const currentUrl = this.page.url();
    const pathname = new URL(currentUrl).pathname;
    return pathname === '/setup-2fa';
  }

  /**
   * Check for error message on setup page
   * @returns true if error message is visible
   */
  async hasError(): Promise<boolean> {
    const errorElement = this.page.locator(this.locator('errorMessage'));
    const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);
    return hasError;
  }
}
