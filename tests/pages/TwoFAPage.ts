import { BasePage } from './BasePage';
import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import { CoreLibrary } from '@core';
import { authenticator } from 'otplib';

export class TwoFAPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'twofa';
  }

  async verify(code: string) {
    try {
      await this.qe.ui.fill(this.locator('codeInput'), code);
      await this.qe.ui.click(this.locator('submitButton'));
      await this.page.waitForLoadState('networkidle');
      const pathname = await this.waitForPathnameChange(['/verify-2fa']);
      const currentUrl = this.page.url();

      if (pathname === '/lobby/dashboard' || pathname.startsWith('/lobby/')) {
        CoreLibrary.log.debug(`[TwoFAPage] Verification successful. Redirected to: ${currentUrl}`);
        return;
      }

      if (pathname.includes('/trial/') && pathname.includes('/dashboard')) {
        CoreLibrary.log.debug(`[TwoFAPage] Verification successful. Redirected to trial dashboard: ${currentUrl}`);
        return;
      }

      if (pathname === '/account-locked' || currentUrl.includes('/account-locked')) {
        CoreLibrary.log.err('Account locked after 2FA verification.');
        throw new Error(
          'Account is locked after 2FA verification. Cannot proceed.'
        );
      }

      if (pathname === '/verify-2fa') {
        CoreLibrary.log.warning(
          'Still on 2FA verification page after code entry. Code may be invalid.'
        );
      } else {
        CoreLibrary.log.err(`[TwoFAPage] Unexpected pathname after verification: ${pathname}. Current URL: ${currentUrl}`);
        throw new Error(`2FA verification failed. Unexpected redirect to: ${pathname}`);
      }
    } catch (error: any) {
      if (error.message.includes('not found')) {
        CoreLibrary.log.err(
          `2FA code input field not found. Check locator 'codeInput' in twofa.properties. ${error.message}`
        );
        throw new Error('2FA verification failed: Code input field not found.');
      }
      if (error.message.includes('Account is locked')) {
        throw error;
      }
      throw error;
    }
  }

  async waitForManualVerification(timeout?: number) {
    const timeoutMs = timeout || 300000;

    try {
      await this.page.waitForLoadState('networkidle');
      const pathname = await this.waitForPathnameChange(['/verify-2fa'], timeoutMs);
      const currentUrl = this.page.url();

      if (pathname === '/lobby/dashboard' || pathname.startsWith('/lobby/')) {
        CoreLibrary.log.debug(`[TwoFAPage] Manual verification successful. Redirected to: ${currentUrl}`);
        return;
      }

      if (pathname.includes('/trial/') && pathname.includes('/dashboard')) {
        CoreLibrary.log.debug(`[TwoFAPage] Manual verification successful. Redirected to trial dashboard: ${currentUrl}`);
        return;
      }

      if (pathname === '/account-locked' || currentUrl.includes('/account-locked')) {
        CoreLibrary.log.err('Account locked after 2FA verification.');
        throw new Error(
          'Account is locked after 2FA verification. Cannot proceed.'
        );
      }

      if (pathname === '/verify-2fa') {
        CoreLibrary.log.err(
          `2FA manual entry timeout after ${timeoutMs}ms. Still on verification page. Current URL: ${currentUrl}`
        );
        throw new Error(
          `2FA manual verification timeout. Please check account or increase timeout.`
        );
      }

      CoreLibrary.log.err(`[TwoFAPage] Unexpected pathname after manual verification: ${pathname}. Current URL: ${currentUrl}`);
      throw new Error(`2FA manual verification failed. Unexpected redirect to: ${pathname}`);
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        throw error;
      }
      if (error.message.includes('Account is locked')) {
        throw error;
      }
      throw error;
    }
  }

  async isOnVerificationPage(): Promise<boolean> {
    const currentUrl = this.page.url();
    const pathname = new URL(currentUrl).pathname;
    return pathname === '/verify-2fa';
  }

  async isOnSetupPage(): Promise<boolean> {
    const currentUrl = this.page.url();
    const pathname = new URL(currentUrl).pathname;
    return pathname === '/setup-2fa';
  }

  async verifyWithSecret(secret: string): Promise<void> {
    authenticator.options = {
      step: 30,
      window: 1
    };

    if (!this.validateSecret(secret)) {
      await CoreLibrary.log.err(`Invalid secret format: ${secret}. Secret must be base32 encoded string (A-Z, 2-7, optional padding with =).`);
      throw new Error(`Invalid secret format: ${secret}`);
    }

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const otp = authenticator.generate(secret);
        await CoreLibrary.log.debug(`2FA attempt ${attempt + 1}/${maxRetries + 1}: Using OTP ${otp}`);
        await this.qe.ui.fill(this.locator('codeInput'), otp);
        await this.qe.ui.click(this.locator('submitButton'));
        await this.page.waitForLoadState('networkidle');
        const pathname = await this.waitForPathnameChange(['/verify-2fa']);
        const currentUrl = this.page.url();

        if (pathname === '/lobby/dashboard' || pathname.startsWith('/lobby/')) {
          await CoreLibrary.log.debug(`[TwoFAPage] 2FA verification successful. Redirected to: ${currentUrl}`);
          return;
        }

        if (pathname.includes('/trial/') && pathname.includes('/dashboard')) {
          await CoreLibrary.log.debug(`[TwoFAPage] 2FA verification successful. Redirected to trial dashboard: ${currentUrl}`);
          return;
        }

        if (pathname === '/account-locked' || currentUrl.includes('/account-locked')) {
          await CoreLibrary.log.err('Account locked after 2FA verification. Cannot proceed.');
          throw new Error('Account locked after 2FA verification');
        }

        if (pathname === '/verify-2fa') {
          await this.page.waitForTimeout(2000);
          const errorElement = this.page.locator(this.locator('errorMessage'));
          const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);
          let errorMessageText = '';
          if (hasError) {
            errorMessageText = await errorElement.textContent().catch(() => '') || '';
            await CoreLibrary.log.warning(`[TwoFAPage] Still on verification page after OTP submission. UI error message: "${errorMessageText}". Current URL: ${currentUrl}. Will retry if attempt < maxRetries.`);
          } else {
            await CoreLibrary.log.warning(`[TwoFAPage] Still on verification page after OTP submission (no UI error message visible). Current URL: ${currentUrl}. Will retry if attempt < maxRetries.`);
          }
          throw new Error(`Still on verification page: ${errorMessageText || 'No error message visible'}`);
        }

        await CoreLibrary.log.warning(`[TwoFAPage] Unexpected pathname after OTP submission: ${pathname}. Current URL: ${currentUrl}. Will check error details and retry if needed.`);

      } catch (error: any) {
        lastError = error;

        const currentUrl = this.page.url();
        const pathname = new URL(currentUrl).pathname;
        const isStillOn2FAPage = pathname === '/verify-2fa';
        const isAccountLocked = pathname === '/account-locked' || currentUrl.includes('/account-locked');

        if (isAccountLocked) {
          await CoreLibrary.log.err(`[TwoFAPage] Account locked after 2FA verification attempt ${attempt + 1}. Cannot proceed.`);
          throw new Error('Account locked after 2FA verification');
        }

        let isInvalidCode = false;
        let errorMessageText = '';
        if (isStillOn2FAPage) {
          await this.page.waitForTimeout(2000);
          const errorElement = this.page.locator(this.locator('errorMessage'));
          const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);
          if (hasError) {
            errorMessageText = await errorElement.textContent().catch(() => '') || '';
            isInvalidCode = errorMessageText.includes('not valid');
          }
        }

        let retryReason = '';
        if (isStillOn2FAPage) {
          if (isInvalidCode) {
            retryReason = `Invalid OTP code detected (UI error: "${errorMessageText}")`;
          } else {
            retryReason = `Still on verification page (pathname: ${pathname}) - OTP may be expired or invalid`;
          }
        } else if (error.message) {
          retryReason = `Error occurred: ${error.message}`;
        } else {
          retryReason = `Unexpected pathname: ${pathname}`;
        }

        if ((isStillOn2FAPage || isInvalidCode) && attempt < maxRetries) {
          await CoreLibrary.log.warning(
            `[TwoFAPage] 2FA attempt ${attempt + 1}/${maxRetries + 1} failed. Reason: ${retryReason}. Current URL: ${currentUrl}. Retrying with new OTP...`
          );
          await this.qe.ui.fill(this.locator('codeInput'), '');
          await this.page.waitForTimeout(2000);
          continue;
        }

        if (attempt >= maxRetries) {
          await CoreLibrary.log.err(`[TwoFAPage] Max retries reached (${maxRetries + 1} attempts). Final failure reason: ${retryReason || 'Unknown error'}. Current URL: ${currentUrl}`);
        } else {
          await CoreLibrary.log.err(`[TwoFAPage] 2FA verification failed (non-retryable error). Reason: ${retryReason || error.message || 'Unknown error'}. Current URL: ${currentUrl}`);
        }

        break;
      }
    }

    const errorMessage = `2FA verification failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`;
    await CoreLibrary.log.warning(`[TwoFAPage] ${errorMessage}`);
    throw lastError || new Error(errorMessage);
  }

  private validateSecret(secret: string): boolean {
    const base32Regex = /^[A-Z2-7]+=*$/;
    return base32Regex.test(secret);
  }


}

