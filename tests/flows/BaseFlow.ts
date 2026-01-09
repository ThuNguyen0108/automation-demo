import { Page, BrowserContext } from '@playwright/test';
import { SessionManager, StorageStateUpdater } from '@support/contextSupport';
import type { SessionConfig, TwoFAOptions } from '@support/contextSupport';
import { LoginPage } from '../pages/LoginPage';
import { TwoFAPage } from '../pages/TwoFAPage';
import { Setup2FAPage } from '../pages/Setup2FAPage';
import { PlaywrightInstance } from '@core';
import { IPlaywrightLibrary } from '@core/playwrightLibrary.interface';
import { testStep } from '@playwrightUtils';
import { CoreLibrary } from '@core';

export abstract class BaseFlow {
  protected page: Page;
  protected context: BrowserContext;
  protected qe: IPlaywrightLibrary;
  protected sessionConfig?: SessionConfig;
  protected storageStateCleanup?: () => void;
  protected loginPage: LoginPage;
  protected twoFAPage: TwoFAPage;

  constructor(page: Page, sessionConfig?: SessionConfig) {
    this.page = page;
    this.context = page.context();
    this.qe = PlaywrightInstance.get(page);
    this.sessionConfig = sessionConfig;
    this.loginPage = new LoginPage(this.qe, this.page);
    this.twoFAPage = new TwoFAPage(this.qe, this.page);
  }

  protected onPageUpdated(): void {}

  protected async performLogin(
    sessionConfig?: SessionConfig,
    twoFAOptions?: TwoFAOptions
  ) {
    await testStep('User logs in successfully', async () => {
      const config = sessionConfig || this.sessionConfig;

      if (config) {
        if (SessionManager.isStorageStateValid(config)) {
          await this.ensureAuthenticated();
          await this.verifyAuthenticated();
          await this.qe.screen.screenshot('01-after-login');
          return;
        }
        await this.performLoginWith2FA(config, twoFAOptions);
      } else {
        await this.loginPage.loginAsAutoAccount();
        await this.handle2FAIfNeeded(twoFAOptions);
      }

      await this.qe.screen.screenshot('01-after-login');
    });
  }

  protected async ensureAuthenticated() {
    if (!this.sessionConfig) return;

    if (SessionManager.isStorageStateValid(this.sessionConfig)) {
      const storageStatePath = SessionManager.loadStorageState(
        this.sessionConfig
      );
      if (storageStatePath) {
        const browser = this.context.browser();
        if (browser) {
          const oldContext = this.context;
          const oldPage = this.page;

          const newContext = await browser.newContext({
            storageState: storageStatePath,
          });
          const newPage = await newContext.newPage();

          this.context = newContext;
          this.page = newPage;
          this.qe = PlaywrightInstance.get(newPage);

          this.loginPage = new LoginPage(this.qe, this.page);
          this.twoFAPage = new TwoFAPage(this.qe, this.page);
          this.onPageUpdated();

          const currentUrl = this.page.url();
          if (
            currentUrl === 'about:blank' ||
            currentUrl === '' ||
            !currentUrl.includes('/lobby/')
          ) {
            const baseUrl =
              this.qe.envProps.get('baseUrl') || 'http://127.0.0.1:3000';
            await this.page.goto(`${baseUrl}/lobby/dashboard`);
          }

          this.initSession();

          await oldPage.close().catch(() => {});
          await oldContext.close().catch(() => {});

          return;
        }
      }
    }

    await this.performLoginWith2FA(this.sessionConfig);
  }

  private async performLoginWith2FA(
    config: SessionConfig,
    twoFAOptions?: TwoFAOptions
  ) {
    const loginResult = await this.loginPage.login(config.email, config.password);

    if (loginResult.secret) {
      await CoreLibrary.log.debug('[BaseFlow] Account has secret from /auth/2fa/secret endpoint. Will use secret for 2FA if needed.');
    } else {
      await CoreLibrary.log.debug('[BaseFlow] Account has no secret from /auth/2fa/secret endpoint. Will auto-detect redirect and handle accordingly.');
    }

    await this.handle2FAIfNeeded(twoFAOptions, loginResult.secret);
    await this.verifyAuthenticated();

    await this.page.waitForTimeout(2000);

    const cookies = await this.page.context().cookies();
    const hasAuthCookie = cookies.some(
      (c) => c.name === 'userAuth' || c.name === 'trialAuth'
    );
    if (!hasAuthCookie) {
      throw new Error(
        'Auth cookies not found after login. StorageState may be invalid.'
      );
    }

    const storageState = await this.page.context().storageState();
    await SessionManager.saveStorageState(config, storageState);
    this.initSession();
  }

  private async waitForPathnameChange(
    fromPathnames: string | string[],
    waitTime?: number,
    interval?: number
  ): Promise<string> {
    return await this.loginPage.waitForPathnameChange(fromPathnames, waitTime, interval);
  }

  private async handle2FAIfNeeded(twoFAOptions?: TwoFAOptions, secret?: string) {
    await this.page.waitForLoadState('networkidle');
    const pathname = await this.waitForPathnameChange(['/login', '/']);
    const currentUrl = this.page.url();

    if (pathname === '/lobby/dashboard' || pathname.startsWith('/lobby/')) {
      await CoreLibrary.log.debug('[BaseFlow] Account bypasses 2FA. Redirected to /lobby/**. Test continues without 2FA.');
      return;
    }

    if (pathname.includes('/trial/') && pathname.includes('/dashboard')) {
      await CoreLibrary.log.debug('[BaseFlow] Trial user bypasses 2FA. Redirected to /trial/**/dashboard. Test continues without 2FA.');
      return;
    }

    if (pathname === '/setup-2fa') {
      if (secret) {
        await CoreLibrary.log.debug('[BaseFlow] Account requires first time 2FA setup. Secret available from /auth/2fa/secret endpoint. Handling setup flow automatically...');
      } else {
        await CoreLibrary.log.debug('[BaseFlow] Account requires first time 2FA setup. No secret from /auth/2fa/secret endpoint. Will attempt QR code extraction (TODO - not yet implemented).');
      }
      await this.handle2FASetup(secret);
      return;
    }

    if (pathname === '/verify-2fa') {
      if (secret) {
        await CoreLibrary.log.debug('[BaseFlow] Account requires 2FA verification. Secret available from /auth/2fa/secret endpoint. Will use secret to generate OTP automatically.');
      } else {
        await CoreLibrary.log.debug('[BaseFlow] Account requires 2FA verification. No secret from /auth/2fa/secret endpoint. Will use TwoFAOptions (manual/provided code).');
      }
      await this.handle2FAVerification(twoFAOptions, secret);
      return;
    }

    if (pathname === '/account-locked') {
      await CoreLibrary.log.err('Account is locked or password expired. Cannot proceed with login.');
      throw new Error('Account is locked or password expired. Cannot proceed with login.');
    }

    if (pathname === '/login' || pathname.includes('error')) {
      await CoreLibrary.log.err(
        `Login failed. Check credentials or account status. Current URL: ${currentUrl}`
      );
      throw new Error('Login failed: Invalid credentials or account issue.');
    }
  }

  private async handle2FASetup(secret?: string): Promise<void> {
    await testStep('Handling first time 2FA setup', async () => {
      const setup2FAPage = new Setup2FAPage(this.qe, this.page);

      let setupSecret = secret;
      if (!setupSecret) {
        await CoreLibrary.log.debug('[BaseFlow] Secret not available from /auth/2fa/secret endpoint for first time setup. Attempting to extract from QR code...');
        try {
          setupSecret = await setup2FAPage.extractSecretFromQRCode();
          await CoreLibrary.log.debug('[BaseFlow] Successfully extracted secret from QR code.');
        } catch (error) {
          await CoreLibrary.log.err('[BaseFlow] QR code extraction not yet implemented. First time 2FA setup requires secret from /auth/2fa/secret endpoint or QR code extraction.');
          throw new Error('First time 2FA setup requires secret from /auth/2fa/secret endpoint or QR code extraction. QR code extraction not yet implemented. Please ensure secret is available from endpoint or wait for QR code extraction implementation.');
        }
      } else {
        await CoreLibrary.log.debug('[BaseFlow] Using secret from /auth/2fa/secret endpoint for first time 2FA setup.');
      }

      await setup2FAPage.setupWithSecret(setupSecret);
    });
  }

  private async handle2FAVerification(twoFAOptions?: TwoFAOptions, secret?: string) {
    if (secret) {
      await testStep('Entering 2FA code automatically (from secret)', async () => {
        await this.twoFAPage.verifyWithSecret(secret);
      });
      return;
    }

    const strategy = twoFAOptions?.strategy || 'auto';
    const code = twoFAOptions?.code;

    if (code) {
      await testStep('Entering 2FA code automatically (provided)', async () => {
        await this.twoFAPage.verify(code);
      });
      return;
    }

    if (strategy === 'manual') {
      await testStep('Waiting for manual 2FA verification', async () => {
        await this.twoFAPage.waitForManualVerification(twoFAOptions?.timeout);
      });
    } else if (strategy === 'auto' && code) {
      await testStep('Entering 2FA code automatically', async () => {
        await this.twoFAPage.verify(code);
      });
    } else {
      if (code) {
        await testStep('Entering 2FA code automatically', async () => {
          await this.twoFAPage.verify(code);
        });
      } else {
        await testStep('Waiting for manual 2FA verification', async () => {
          await this.twoFAPage.waitForManualVerification(twoFAOptions?.timeout);
        });
      }
    }
  }

  protected initSession() {
    if (this.sessionConfig) {
      this.storageStateCleanup = StorageStateUpdater.monitorAndUpdateOnRefresh(
        this.page,
        this.sessionConfig
      );
    }
  }

  protected async verifyAuthenticated() {
    await this.page.waitForLoadState('networkidle');
    const pathname = await this.waitForPathnameChange(['/login', '/verify-2fa', '/setup-2fa', '/']);
    const currentUrl = this.page.url();

    if (pathname === '/lobby/dashboard' || pathname.startsWith('/lobby/')) {
      await CoreLibrary.log.debug(`[BaseFlow] Authenticated as regular user. Current URL: ${currentUrl}`);
      return;
    }

    if (pathname.includes('/trial/') && pathname.includes('/dashboard')) {
      await CoreLibrary.log.debug(`[BaseFlow] Authenticated as trial user. Current URL: ${currentUrl}`);
      return;
    }

    await CoreLibrary.log.err(`Session invalid - not authenticated. Current URL: ${currentUrl}, pathname: ${pathname}`);
    throw new Error('Session invalid - not authenticated');
  }

  async dispose() {
    if (this.storageStateCleanup) {
      this.storageStateCleanup();
    }
  }

  /*
      FUNCTION: easy for combination to bigger flow
   */

  async enterEmailAndPassword(
    email?: string,
    password?: string
  ): Promise<{ secret?: string }> {
    let secret: string | undefined;

    await testStep('Enter Email and Password', async () => {
      const loginResult = await this.loginPage.login(email, password);
      secret = loginResult.secret;
      await this.page.waitForLoadState('networkidle');
      await this.loginPage.waitForPathnameChange(['/login', '/']);
    });

    return { secret };
  }

  async enter2FA(code?: string, secret?: string): Promise<void> {
    await testStep('Enter 2FA Code', async () => {
      if (secret) {
        await this.handle2FAIfNeeded(undefined, secret);
      } else if (code) {
        await this.handle2FAIfNeeded({ strategy: 'auto', code });
      } else {
        await this.handle2FAIfNeeded();
      }
    });
  }

  async landOnDashboard(): Promise<void> {
    await testStep('Land on Dashboard', async () => {
      await this.verifyAuthenticated();
      await this.qe.screen.screenshot('landed-on-dashboard');
    });
  }

  async clickItemsInSidebarByName(item) {
    await testStep(`Click ${item} in sidebar`, async () => {

    })
  }

  async searchItem(item) {

  }

  async verifyResultList() {

  }


  /*
      FLOW: many functions together
   */

  async standardLogin(email?: string, password?: string) {
    await testStep(`Standard Login`, async() => {
      await this.enterEmailAndPassword(email, password);
      await this.enter2FA();
      await this.landOnDashboard();
    })
  }

  async mainMenuWalkthrough(listOfItem?) {
    await testStep(`Main Menu Walkthrough`, async() => {
      await this.clickItemsInSidebarByName(...listOfItem)
      await this.waitForPathnameChange('/')
    })
  }

  async globalSearch(item?) {
    await testStep(`Global Search Success`, async() => {
      await this.searchItem(item)
      await this.verifyResultList()
    })
  }

  async createNewOrg() {

  }

  async addcompany() {

  }

}


export function createComponentFlow(page: Page): BaseFlow {
  return new (class extends BaseFlow {})(page);
}
