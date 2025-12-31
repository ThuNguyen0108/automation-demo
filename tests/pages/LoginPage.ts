import { BasePage } from './BasePage';
import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';

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
   * Fill email & password and submit the form
   * @param email - Email address
   * @param password - Password
   */
  async login(email: string, password: string) {
    await this.open();
    await this.qe.ui.fill(this.locator('emailInput'), email);
    await this.qe.ui.fill(this.locator('passwordInput'), password);
    await this.qe.ui.click(this.locator('submitButton'));
    
    // Wait for navigation (bỏ qua 2FA vì account đặc biệt)
    await this.page.waitForURL('**/lobby/**', { timeout: 30000 });
  }
  
  /**
   * Login với account đặc biệt (tự động bỏ qua 2FA)
   * Email: auto-speedydd-01@outlook.com
   * Password: Abc123456@
   */
  async loginAsAutoAccount() {
    const email = 'auto-speedydd-01@outlook.com';
    const password = 'Abc123456@';
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
}






