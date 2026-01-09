import { BasePage } from './BasePage';
import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import { CoreLibrary } from '@core';

export class LoginPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'login';
  }

  async open() {
    await this.goto('/login');
  }

  private async getSecretFromEndpoint(
    email: string,
    password: string,
    apiBaseUrl: string = 'https://api-dev.speedydd.com'
  ): Promise<string | null> {
    try {
      const secretResponse = await this.qe.api.returnPost({
        uri: `${apiBaseUrl}/auth/2fa/secret`,
        headers: {
          'Content-Type': 'application/json'
        },
        requestBody: {
          email: email,
          password: password
        }
      }) as any;

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

  async login(email: string, password: string): Promise<{ success: boolean; secret?: string }> {
    await this.open();
    await this.qe.ui.fill(this.locator('emailInput'), email);
    await this.qe.ui.fill(this.locator('passwordInput'), password);
    await this.qe.ui.click(this.locator('submitButton'));
    await this.page.waitForLoadState('networkidle');
    const apiBaseUrl = this.qe.envProps.get('apiBaseUrl') || 'https://api-dev.speedydd.com';
    const secret = await this.getSecretFromEndpoint(email, password, apiBaseUrl);

    return {
      success: true,
      secret: secret || undefined
    };
  }

  async loginAsAutoAccount() {
    const email = 'auto-speedydd-01@outlook.com';
    const password = 'Abc123456!';
    await this.login(email, password);
  }

  async loginAsAdminFromEnv() {
    const email = process.env.SPEEDYDD_DEV_EMAIL || 'admin@dev.speedydd.com';
    const password = process.env.SPEEDYDD_DEV_PASSWORD || 'Password123!';
    await this.login(email, password);
  }




  async enterEmail(email: string): Promise<void> {
    await this.qe.ui.fill(this.locator('emailInput'), email);
  }

  async enterPassword(password: string): Promise<void> {
    await this.qe.ui.fill(this.locator('passwordInput'), password);
  }

  async clickSubmit(): Promise<void> {
    await this.qe.ui.click(this.locator('submitButton'));
  }

  
}











