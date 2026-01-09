import { BasePage } from './BasePage';
import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import { CoreLibrary } from '@core';

/**
 * LoginPage - Page object cho login page
 *
 * Reference: speedydd-automation/src/pages/LoginPageWeb.ts
 */
export class LoginPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'login';
  }

  /**
   * Navigate to the login page
   */
  async open() {
    await this.goto('/login');
  }

  /**
   * Call POST /auth/2fa/secret endpoint để lấy secret
   * Helper method để wrap APIUtil logic
   * 
   * Framework Pattern:
   * - Sử dụng qe.api.returnPost() để call API endpoint (framework APIUtil)
   * 
   * API Endpoint:
   * - POST https://api-dev.speedydd.com/auth/2fa/secret
   * - Headers: Content-Type: application/json
   * - Body: { email: string, password: string }
   * - Response: { secret: string } (nếu account có 2FA secret)
   * 
   * @param email - Email address
   * @param password - Password
   * @param apiBaseUrl - API base URL (default: https://api-dev.speedydd.com)
   * @returns Promise<string | null> - Secret hoặc null nếu không có
   */
  private async getSecretFromEndpoint(
    email: string,
    password: string,
    apiBaseUrl: string = 'https://api-dev.speedydd.com'
  ): Promise<string | null> {
    try {
      // Call POST /auth/2fa/secret endpoint với email và password (sử dụng framework APIUtil)
      const secretResponse = await this.qe.api.returnPost({
        uri: `${apiBaseUrl}/auth/2fa/secret`,
        headers: {
          'Content-Type': 'application/json'
        },
        requestBody: {
          email: email,
          password: password
        }
      }) as any; // Cast to any để access status() và json() methods

      const status = secretResponse.status();
      
      if (status >= 200 && status < 300) {
        const secretBody = await secretResponse.json();
        const secret = secretBody.secret || null;
        
        if (secret) {
          CoreLibrary.log.debug(`[LoginPage] Secret retrieved from /auth/2fa/secret endpoint: ${secret}. Account requires 2FA with secret.`);
        } else {
          CoreLibrary.log.debug(`[LoginPage] /auth/2fa/secret endpoint returned empty secret. Response body: ${JSON.stringify(secretBody, null, 2)}. Test will continue using TwoFAOptions.`);
        }
        return secret;
      } else if (status === 403) {
        CoreLibrary.log.debug(`[LoginPage] /auth/2fa/secret endpoint returned 403 Forbidden. Endpoint may not be enabled (AUTOTEST_BYPASS_2FA !== "true"). Test will continue using TwoFAOptions (manual/provided code) if 2FA needed.`);
        return null;
      } else {
        const errorBody = await secretResponse.text().catch(() => '');
        CoreLibrary.log.debug(`[LoginPage] /auth/2fa/secret endpoint returned status ${status}. Response: ${errorBody}. Test will continue using TwoFAOptions (manual/provided code) if 2FA needed.`);
        return null;
      }
    } catch (error: any) {
      if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
        CoreLibrary.log.debug(`[LoginPage] /auth/2fa/secret endpoint call timeout. Test will continue using TwoFAOptions (manual/provided code) if 2FA needed.`);
      } else {
        CoreLibrary.log.debug(`[LoginPage] Failed to call /auth/2fa/secret endpoint: ${error.message || error}. Test will continue using TwoFAOptions (manual/provided code) if 2FA needed.`);
      }
      return null;
    }
  }

  /**
   * Fill email & password, submit form, sau đó call POST /auth/2fa/secret endpoint để lấy secret
   * 
   * Framework Pattern:
   * - Sử dụng qe.ui.* cho UI interactions (framework standard)
   * - Sử dụng getSecretFromEndpoint() helper method để call API endpoint (wraps qe.api.returnPost)
   * - Sử dụng CoreLibrary.log.* cho logging (framework standard)
   * 
   * API Endpoint Logic (from @speedydd-apiservices):
   * - POST /auth/2fa/secret với body { email, password }
   * - Endpoint chỉ hoạt động khi AUTOTEST_BYPASS_2FA === "true"
   * - Nếu không có env → 403 Forbidden
   * - Service getTwoFaSecret() luôn return secret (không bao giờ null):
   *   * Nếu user có secret → return secret hiện tại
   *   * Nếu user chưa có secret → generate và return secret mới
   * 
   * @param email - Email address
   * @param password - Password
   * @returns Object với success flag và secret (nếu có)
   */
  async login(email: string, password: string): Promise<{ success: boolean; secret?: string }> {
    // Perform login (sử dụng framework utils)
    await this.open();
    await this.qe.ui.fill(this.locator('emailInput'), email);
    await this.qe.ui.fill(this.locator('passwordInput'), password);
    await this.qe.ui.click(this.locator('submitButton'));

    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle');

    // Call POST /auth/2fa/secret endpoint với email và password
    const apiBaseUrl = this.qe.envProps.get('apiBaseUrl') || 'https://api-dev.speedydd.com';
    const secret = await this.getSecretFromEndpoint(email, password, apiBaseUrl);

    return {
      success: true,
      secret: secret || undefined
    };
  }

  /**
   * Login với account đặc biệt (tự động bỏ qua 2FA)
   * Email: auto-speedydd-01@outlook.com
   * Password: Abc123456@
   */
  async loginAsAutoAccount() {
    const email = 'auto-speedydd-01@outlook.com';
    const password = 'Abc123456!';
    await this.login(email, password);
  }

  /**
   * Login với credentials từ environment variables
   */
  async loginAsAdminFromEnv() {
    const email = process.env.SPEEDYDD_DEV_EMAIL || 'admin@dev.speedydd.com';
    const password = process.env.SPEEDYDD_DEV_PASSWORD || 'Password123!';
    await this.login(email, password);
  }




  /**
   * Atomic action: Enter email vào input field
   * 
   * Framework Pattern:
   * - Atomic UI action - không có testStep (testStep ở BaseFlow/JourneyFlow)
   * - Sử dụng this.qe.ui.fill() cho UI interactions (framework standard)
   * - Sử dụng this.locator('key') để lấy selector từ login.properties file
   * - Pattern giống với existing login() method (line 149)
   * 
   * @param email - Email address to enter
   */
  async enterEmail(email: string): Promise<void> {
    await this.qe.ui.fill(this.locator('emailInput'), email);
  }

  /**
   * Atomic action: Enter password vào input field
   * 
   * Framework Pattern:
   * - Atomic UI action - không có testStep
   * - Sử dụng this.qe.ui.fill() cho UI interactions (framework standard)
   * - Sử dụng this.locator('passwordInput') từ login.properties
   * - Pattern giống với existing login() method (line 150)
   * 
   * @param password - Password to enter
   */
  async enterPassword(password: string): Promise<void> {
    await this.qe.ui.fill(this.locator('passwordInput'), password);
  }

  /**
   * Atomic action: Click submit button
   * 
   * Framework Pattern:
   * - Atomic UI action - không có testStep
   * - Sử dụng this.qe.ui.click() cho UI interactions (framework standard)
   * - Sử dụng this.locator('submitButton') từ login.properties
   * - Pattern giống với existing login() method (line 151)
   * 
   * Note: Method này KHÔNG wait for navigation - navigation sẽ được handle ở BaseFlow/JourneyFlow
   */
  async clickSubmit(): Promise<void> {
    await this.qe.ui.click(this.locator('submitButton'));
  }

  
}











