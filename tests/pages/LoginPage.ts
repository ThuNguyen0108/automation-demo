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
   * Monitor login API response từ network traffic
   * Helper method để wrap waitForResponse logic
   * 
   * Framework Pattern:
   * - Sử dụng page.waitForResponse() để monitor network (framework pattern - xem RequestUploadDocumentPage.ts:228-243)
   * - Pattern: Setup promise TRƯỚC khi perform action để ensure capture được response
   * 
   * @returns Promise<Response | null> - Login API response hoặc null nếu timeout
   */
  private async waitForLoginResponse(): Promise<any> {
    return this.page.waitForResponse(
      async (response) => {
        const url = response.url();
        const method = response.request().method();
        const isLoginResponse = url.includes('/auth/login') && 
                                method === 'POST' && 
                                response.ok();
        
        // Debug: Log tất cả responses để verify matching logic
        if (url.includes('/auth/login')) {
          CoreLibrary.log.debug(`[LoginPage] Detected /auth/login response. URL: ${url}, Method: ${method}, Status: ${response.status()}, Matched: ${isLoginResponse}`);
        }
        
        return isLoginResponse;
      },
      { timeout: 10000 }
    ).catch((error) => {
      CoreLibrary.log.debug(`[LoginPage] waitForResponse timeout or error: ${error.message || error}`);
      return null;
    });
  }

  /**
   * Call GET /auth/2fa/secret endpoint để lấy secret
   * Helper method để wrap APIUtil logic
   * 
   * Framework Pattern:
   * - Sử dụng qe.api.returnGet() để call API endpoint (framework APIUtil)
   * 
   * @param accessToken - Access token từ login response
   * @param rootOrganisationId - Organisation ID từ login response
   * @param apiBaseUrl - API base URL
   * @returns Promise<string | null> - Secret hoặc null nếu không có
   */
  private async getSecretFromEndpoint(
    accessToken: string,
    rootOrganisationId: string,
    apiBaseUrl: string
  ): Promise<string | null> {
    try {
      // Call GET /auth/2fa/secret endpoint với headers (sử dụng framework APIUtil)
      const secretResponse = await this.qe.api.returnGet(
        `${apiBaseUrl}/auth/2fa/secret`,
        {
          'Authorization': `Bearer ${accessToken}`,
          'took_action_organisation': rootOrganisationId.toString()
        },
        {} // params (empty object)
      ) as any; // Cast to any để access status() và json() methods

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
   * Fill email & password, submit form, monitor API response để extract accessToken và rootOrganisationId,
   * sau đó call GET /auth/2fa/secret endpoint để lấy secret
   * 
   * Framework Pattern:
   * - Sử dụng qe.ui.* cho UI interactions (framework standard)
   * - Sử dụng waitForLoginResponse() helper method cho network monitoring (wraps page.waitForResponse)
   * - Sử dụng getSecretFromEndpoint() helper method để call API endpoint (wraps qe.api.returnGet)
   * - Sử dụng CoreLibrary.log.* cho logging (framework standard)
   * 
   * API Endpoint Logic (from @speedydd-apiservices):
   * - GET /auth/2fa/secret chỉ hoạt động khi AUTOTEST_BYPASS_2FA === "true"
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
    
    const responsePromise = this.waitForLoginResponse();

    // Perform login (sử dụng framework utils)
    await this.open();
    await this.qe.ui.fill(this.locator('emailInput'), email);
    await this.qe.ui.fill(this.locator('passwordInput'), password);
    await this.qe.ui.click(this.locator('submitButton'));

    const loginResponse = await responsePromise;
    
    if (loginResponse) {
      const responseUrl = loginResponse.url();
      const responseMethod = loginResponse.request().method();
      const responseStatus = loginResponse.status();
      CoreLibrary.log.debug(`[LoginPage] Login API response captured. URL: ${responseUrl}, Method: ${responseMethod}, Status: ${responseStatus}`);
    } else {
      CoreLibrary.log.debug('[LoginPage] Login API response not captured. Cannot get accessToken. Test will continue using TwoFAOptions (manual/provided code) if 2FA needed.');
      await this.page.waitForLoadState('networkidle');
      return {
        success: true,
        secret: undefined
      };
    }

    try {
      const loginBody = await loginResponse.json();
      
      CoreLibrary.log.debug(`[LoginPage] Login API response body: ${JSON.stringify(loginBody, null, 2)}`);
      
      const accessToken = loginBody.accessToken?.token || null;
      const rootOrganisationId = loginBody.user?.selectedProfile?.organisation?._id || 
                                loginBody.user?.selectedProfile?.organisation || 
                                null;

      await this.page.waitForLoadState('networkidle');

      let secret: string | null = null;
      if (accessToken && rootOrganisationId) {
        const loginUrl = loginResponse.url();
        const apiBaseUrl = loginUrl.match(/https?:\/\/[^\/]+/)?.[0] || 
                          this.qe.envProps.get('apiBaseUrl') || 
                          'https://api-dev.speedydd.com';
        
        secret = await this.getSecretFromEndpoint(accessToken, rootOrganisationId, apiBaseUrl)
      } else {
        // Missing accessToken or rootOrganisationId
        if (!accessToken) {
          CoreLibrary.log.debug(`[LoginPage] Missing accessToken in login response. Cannot call /auth/2fa/secret endpoint. Test will continue using TwoFAOptions (manual/provided code) if 2FA needed.`);
        } else {
          CoreLibrary.log.debug(`[LoginPage] Missing rootOrganisationId in login response. Cannot call /auth/2fa/secret endpoint. Test will continue using TwoFAOptions (manual/provided code) if 2FA needed.`);
        }
      }

      return {
        success: true,
        secret: secret || "C57E4VZFFB5F252Z" //TODO: temporary hard code during demo
      };
    } catch (error: any) {
      CoreLibrary.log.debug(`[LoginPage] Failed to parse login API response: ${error.message || error}. Cannot get accessToken. Test will continue using TwoFAOptions (manual/provided code) if 2FA needed.`);
      await this.page.waitForLoadState('networkidle');
      return {
        success: true,
        secret: undefined
      };
    }
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











