import { BasePage } from './BasePage';
import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import { CoreLibrary } from '@core';
import { authenticator } from 'otplib';

/**
 * TwoFAPage - Page object cho 2FA verification page
 *
 * Features:
 * - Pure UI interactions (fill code, submit)
 * - Support auto verification (fill code automatically)
 * - Support manual verification (wait for user input)
 * - Page detection methods
 *
 * Reference: speedydd-automation/src/core/SessionManager.ts (Line 229-262)
 */
export class TwoFAPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'twofa';
  }

  /**
   * Fill 2FA code và submit (auto verification)
   * @param code - 2FA code (6 digits)
   */
  async verify(code: string) {
    try {
      // Fill code input
      await this.qe.ui.fill(this.locator('codeInput'), code);

      // Submit button
      await this.qe.ui.click(this.locator('submitButton'));

      // Wait for network to be idle to ensure redirect has completed
      await this.page.waitForLoadState('networkidle');

      // Wait for pathname to change from /verify-2fa (consistent with BaseFlow approach)
      const pathname = await this.waitForPathnameChange(['/verify-2fa']);
      const currentUrl = this.page.url();

      // Check if pathname matches authenticated paths (consistent with BaseFlow.verifyAuthenticated())
      // Regular users: /lobby/dashboard or /lobby/**
      if (pathname === '/lobby/dashboard' || pathname.startsWith('/lobby/')) {
        CoreLibrary.log.debug(`[TwoFAPage] Verification successful. Redirected to: ${currentUrl}`);
        return;
      }

      // Trial users: /trial/{affiliateId}/dashboard
      if (pathname.includes('/trial/') && pathname.includes('/dashboard')) {
        CoreLibrary.log.debug(`[TwoFAPage] Verification successful. Redirected to trial dashboard: ${currentUrl}`);
        return;
      }

      // Check if account locked
      if (pathname === '/account-locked' || currentUrl.includes('/account-locked')) {
        CoreLibrary.log.err('Account locked after 2FA verification.');
        throw new Error(
          'Account is locked after 2FA verification. Cannot proceed.'
        );
      }

      // Check if still on verification page (invalid code)
      if (pathname === '/verify-2fa') {
        CoreLibrary.log.warning(
          'Still on 2FA verification page after code entry. Code may be invalid.'
        );
        // Don't throw - let BaseFlow handle (may retry or fail)
      } else {
        // Other error - unexpected pathname
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
        throw error; // Re-throw account locked error
      }
      throw error;
    }
  }

  /**
   * Wait for user to manually enter 2FA code
   * @param timeout - Timeout in milliseconds (default: 5 minutes = 300000)
   */
  async waitForManualVerification(timeout?: number) {
    const timeoutMs = timeout || 300000; // Default: 5 minutes

    try {
      // Wait for network to be idle to ensure redirect has completed
      await this.page.waitForLoadState('networkidle');
      
      // Wait for pathname to change from /verify-2fa (consistent with BaseFlow approach)
      // Use custom timeout for manual verification (longer than default)
      const pathname = await this.waitForPathnameChange(['/verify-2fa'], timeoutMs);
      const currentUrl = this.page.url();

      // Check if pathname matches authenticated paths (consistent with BaseFlow.verifyAuthenticated())
      // Regular users: /lobby/dashboard or /lobby/**
      if (pathname === '/lobby/dashboard' || pathname.startsWith('/lobby/')) {
        CoreLibrary.log.debug(`[TwoFAPage] Manual verification successful. Redirected to: ${currentUrl}`);
        return;
      }

      // Trial users: /trial/{affiliateId}/dashboard
      if (pathname.includes('/trial/') && pathname.includes('/dashboard')) {
        CoreLibrary.log.debug(`[TwoFAPage] Manual verification successful. Redirected to trial dashboard: ${currentUrl}`);
        return;
      }

      // Check if account locked
      if (pathname === '/account-locked' || currentUrl.includes('/account-locked')) {
        CoreLibrary.log.err('Account locked after 2FA verification.');
        throw new Error(
          'Account is locked after 2FA verification. Cannot proceed.'
        );
      }

      // Still on verification page - timeout
      if (pathname === '/verify-2fa') {
        CoreLibrary.log.err(
          `2FA manual entry timeout after ${timeoutMs}ms. Still on verification page. Current URL: ${currentUrl}`
        );
        throw new Error(
          `2FA manual verification timeout. Please check account or increase timeout.`
        );
      }

      // Other unexpected pathname
      CoreLibrary.log.err(`[TwoFAPage] Unexpected pathname after manual verification: ${pathname}. Current URL: ${currentUrl}`);
      throw new Error(`2FA manual verification failed. Unexpected redirect to: ${pathname}`);
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        throw error; // Re-throw timeout error
      }
      if (error.message.includes('Account is locked')) {
        throw error; // Re-throw account locked error
      }
      throw error;
    }
  }

  /**
   * Check if currently on 2FA verification page
   * @returns true if on /verify-2fa page
   */
  async isOnVerificationPage(): Promise<boolean> {
    const currentUrl = this.page.url();
    const pathname = new URL(currentUrl).pathname;
    return pathname === '/verify-2fa';
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
   * Verify 2FA với secret (auto-generate OTP)
   * 
   * Framework Pattern:
   * - Sử dụng qe.ui.* cho UI interactions (framework standard)
   * - Sử dụng waitForPathnameChange() cho navigation (consistent with BaseFlow)
   * - Sử dụng this.page.locator() cho error detection (framework không có util)
   * - Sử dụng CoreLibrary.log.* cho logging (framework standard)
   * 
   * @param secret - 2FA secret (base32 format)
   */
  async verifyWithSecret(secret: string): Promise<void> {
    // Set otplib options để handle clock drift
    authenticator.options = {
      step: 30,      // 30 seconds per time step
      window: 1      // Allow ±1 time step tolerance (±30 seconds)
    };

    // Validate secret format
    if (!this.validateSecret(secret)) {
      CoreLibrary.log.err(`Invalid secret format: ${secret}. Secret must be base32 encoded string (A-Z, 2-7, optional padding with =).`);
      throw new Error(`Invalid secret format: ${secret}`);
    }

    const maxRetries = 2; // Max 2 retries = 3 total attempts (1 initial + 2 retries)
    // Note: Backend locks account after 4 failed attempts, so we limit to 3 total attempts
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Generate OTP ngay trước khi fill (fresh OTP)
        const otp = authenticator.generate(secret);
        
        CoreLibrary.log.debug(`2FA attempt ${attempt + 1}/${maxRetries + 1}: Using OTP ${otp}`);
        
        // Fill OTP ngay lập tức (sử dụng framework utils)
        await this.qe.ui.fill(this.locator('codeInput'), otp);
        
        // Submit ngay lập tức (sử dụng framework utils)
        await this.qe.ui.click(this.locator('submitButton'));
        
        // Wait for network to be idle to ensure redirect has completed
        await this.page.waitForLoadState('networkidle');
        
        // Wait for pathname to change from /verify-2fa (consistent with BaseFlow approach)
        const pathname = await this.waitForPathnameChange(['/verify-2fa']);
        const currentUrl = this.page.url();

        // Check if pathname matches authenticated paths (consistent with BaseFlow.verifyAuthenticated())
        // Regular users: /lobby/dashboard or /lobby/**
        if (pathname === '/lobby/dashboard' || pathname.startsWith('/lobby/')) {
          CoreLibrary.log.debug(`[TwoFAPage] 2FA verification successful. Redirected to: ${currentUrl}`);
          return;
        }

        // Trial users: /trial/{affiliateId}/dashboard
        if (pathname.includes('/trial/') && pathname.includes('/dashboard')) {
          CoreLibrary.log.debug(`[TwoFAPage] 2FA verification successful. Redirected to trial dashboard: ${currentUrl}`);
          return;
        }

        // Check if account locked
        if (pathname === '/account-locked' || currentUrl.includes('/account-locked')) {
          CoreLibrary.log.err('Account locked after 2FA verification. Cannot proceed.');
          throw new Error('Account locked after 2FA verification');
        }

        // Still on verification page - check for UI error message
        if (pathname === '/verify-2fa') {
          // Wait a bit for error message to appear (frontend may delay showing error)
          await this.page.waitForTimeout(500);
          // Check error message với timeout
          const errorElement = this.page.locator(this.locator('errorMessage'));
          const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);
          let errorMessageText = '';
          if (hasError) {
            errorMessageText = await errorElement.textContent().catch(() => '') || '';
            CoreLibrary.log.warning(`[TwoFAPage] Still on verification page after OTP submission. UI error message: "${errorMessageText}". Current URL: ${currentUrl}. Will retry if attempt < maxRetries.`);
          } else {
            CoreLibrary.log.warning(`[TwoFAPage] Still on verification page after OTP submission (no UI error message visible). Current URL: ${currentUrl}. Will retry if attempt < maxRetries.`);
          }
          // Throw error để trigger retry logic trong catch block
          throw new Error(`Still on verification page: ${errorMessageText || 'No error message visible'}`);
        }

        // Other unexpected pathname
        CoreLibrary.log.warning(`[TwoFAPage] Unexpected pathname after OTP submission: ${pathname}. Current URL: ${currentUrl}. Will check error details and retry if needed.`);
        
      } catch (error: any) {
        lastError = error;
        
        // Check if still on 2FA page (OTP expired/invalid)
        const currentUrl = this.page.url();
        const pathname = new URL(currentUrl).pathname;
        const isStillOn2FAPage = pathname === '/verify-2fa';
        const isAccountLocked = pathname === '/account-locked' || currentUrl.includes('/account-locked');
        
        if (isAccountLocked) {
          CoreLibrary.log.err(`[TwoFAPage] Account locked after 2FA verification attempt ${attempt + 1}. Cannot proceed.`);
          throw new Error('Account locked after 2FA verification');
        }
        
        // Error detection strategy: Check URL first (fastest), then error message with timeout
        // Strategy 1: Check URL (immediate)
        // Strategy 2: Wait a bit for error message to appear, then check with timeout
        let isInvalidCode = false;
        let errorMessageText = '';
        if (isStillOn2FAPage) {
          // Wait a bit for error message to appear (frontend may delay showing error)
          await this.page.waitForTimeout(500);
          // Check error message với timeout
          const errorElement = this.page.locator(this.locator('errorMessage'));
          const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);
          if (hasError) {
            errorMessageText = await errorElement.textContent().catch(() => '') || '';
            isInvalidCode = errorMessageText.includes('not valid');
          }
        }
        
        // Determine retry reason for logging
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
          // Log detailed warning với retry reason
          CoreLibrary.log.warning(
            `[TwoFAPage] 2FA attempt ${attempt + 1}/${maxRetries + 1} failed. Reason: ${retryReason}. Current URL: ${currentUrl}. Retrying with new OTP...`
          );
          // Clear input và wait for next time window (sử dụng framework utils)
          await this.qe.ui.fill(this.locator('codeInput'), '');
          await this.page.waitForTimeout(2000); // Wait 2s for next time window
          continue; // Retry với new OTP
        }
        
        // Max retries reached hoặc other error - log final failure reason
        if (attempt >= maxRetries) {
          CoreLibrary.log.err(`[TwoFAPage] Max retries reached (${maxRetries + 1} attempts). Final failure reason: ${retryReason || 'Unknown error'}. Current URL: ${currentUrl}`);
        } else {
          CoreLibrary.log.err(`[TwoFAPage] 2FA verification failed (non-retryable error). Reason: ${retryReason || error.message || 'Unknown error'}. Current URL: ${currentUrl}`);
        }
        
        // Max retries hoặc other error
        break;
      }
    }
    
    // All retries failed - log warning và throw với proper stack trace
    const errorMessage = `2FA verification failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`;
    CoreLibrary.log.warning(`[TwoFAPage] ${errorMessage}`);
    // Throw error riêng để có stack trace chính xác từ TwoFAPage.ts (không dùng log.err vì nó throw và làm mất stack trace)
    throw lastError || new Error(errorMessage);
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


}

