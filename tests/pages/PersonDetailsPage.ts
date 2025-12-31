import { BasePage } from './BasePage';
import { IPlaywrightLibrary, CoreLibrary } from '@core';
import { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * PersonDetailsPage - Page object cho Person Details page
 * 
 * Reference: speedydd-automation/src/pages/PersonDetailsPageWeb.ts
 */
export class PersonDetailsPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'persons';
  }
  
  // Timeout constants
  private readonly TIMEOUTS = {
    short: 2000,
    medium: 5000,
    long: 10000,
    veryLong: 15000,
  };
  
  // Common selectors for Recipient component detection
  private readonly RECIPIENT_SELECTORS = {
    toButton: [
      'button:has-text("To"):not(:has-text("CC"))',
      'button:has-text("To")',
      'button:has(div:has-text("To"))',
      'button:has(span:has-text("To"))',
    ],
    ccButton: 'button:has-text("CC")',
    reactMultiEmail: '[class*="ReactMultiEmail"], [class*="react-multi-email"]',
    dataTag: '[data-tag]',
    multipleEmail: '[class*="MultipleEmail"]',
  };
  
  // Selectors for email input detection
  private readonly EMAIL_INPUT_SELECTORS = [
    'input[name="email"][type="email"]',
    'input[name="email"]',
    'input[type="email"]',
  ];
  
  /**
   * Navigate to Person Details page
   * @param personId - The person ID
   */
  async goto(personId: string) {
    await CoreLibrary.log.step(`Navigating to person details page: ${personId}`);
    await super.goto(`/lobby/edit-person/${personId}`);
    await this.safeWaitForLoadState();
    await expect(this.page).toHaveURL(/\/lobby\/edit-person\/[^/]+/);
    await CoreLibrary.log.debug(`Successfully navigated to person details page: ${personId}`);
  }
  
  /**
   * Helper: Safely wait for load state (ignore timeout)
   */
  private async safeWaitForLoadState() {
    await this.page.waitForLoadState('networkidle', { timeout: this.TIMEOUTS.long }).catch(() => {
      // Ignore timeout
    });
  }
  
  /**
   * Navigate to the Documents tab
   * URL pattern: /lobby/edit-person/[personId]?tab=uploadfiles
   */
  async navigateToDocumentsTab() {
    await CoreLibrary.log.step('Navigating to Documents tab');
    if (this.page.url().includes('tab=uploadfiles')) {
      await CoreLibrary.log.debug('Already on Documents tab');
      return;
    }

    await this.clickDocumentsTab();
    await this.page.waitForURL(/\/lobby\/edit-person\/[^/]+\?tab=uploadfiles/, {
      timeout: this.TIMEOUTS.long,
    });
    await this.waitForFolderTree();
    await CoreLibrary.log.debug('Documents tab opened successfully');
  }
  
  /**
   * Helper: Click Documents tab (handles both visible tab and menu)
   */
  private async clickDocumentsTab() {
    const documentsTab = this.page.locator(this.locator('personDetailsDocumentsTab'));
    const documentsTabByText = this.page.locator(this.locator('personDetailsDocumentsTabByText'));
    
    await Promise.race([
      documentsTab.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long }),
      documentsTabByText.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long }),
    ]).catch((error) => {
      throw new Error(
        `Documents tab not found. This may be due to missing permissions or tab not available. ` +
        `Original error: ${error.message}`
      );
    });

    const isMainTabVisible = await documentsTab.isVisible().catch(() => false);
    if (isMainTabVisible) {
      await documentsTab.click();
    } else {
      await this.clickDocumentsTabFromMenu(documentsTabByText);
    }
  }
  
  /**
   * Helper: Click Documents tab from "more tabs" menu
   */
  private async clickDocumentsTabFromMenu(documentsTabByText: ReturnType<typeof this.page.locator>) {
    const moreTabsMenu = this.page.locator(this.locator('personDetailsMoreTabsMenu')).first();
    const isMenuVisible = await moreTabsMenu.isVisible().catch(() => false);
    
    if (!isMenuVisible) {
      const menuDots = this.page.locator(this.locator('personDetailsMenuDots')).last();
      await menuDots.click();
      await this.page.waitForTimeout(500);
    }
    await documentsTabByText.click();
  }
  
  /**
   * Helper: Wait for folder tree to be visible
   */
  private async waitForFolderTree() {
    const folderTree = this.page.locator(this.locator('personDetailsFolderTree'));
    await folderTree.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long }).catch(() => {
      // Folder tree might load asynchronously
    });
  }
  
  /**
   * Locate a folder by name in the folder tree
   * @param folderName - The folder name (e.g., "CV")
   * @returns Locator for the folder row
   */
  private async locateFolderByName(folderName: string) {
    await CoreLibrary.log.debug(`Locating folder: ${folderName}`);
    // Folder items have id="folder-{folderId}" and contain folder name text
    const folderLocator = this.page.locator(`${this.locator('personDetailsFolderItem')}:has-text("${folderName}")`);
    await folderLocator.waitFor({ state: 'visible', timeout: 10000 });
    await CoreLibrary.log.debug(`Folder found: ${folderName}`);
    return folderLocator;
  }
  
  /**
   * Open the action menu for a specific folder
   * @param folderName - The folder name (e.g., "CV")
   */
  async openFolderActionMenu(folderName: string) {
    await CoreLibrary.log.step(`Opening action menu for folder: ${folderName}`);
    const folderRow = await this.locateFolderByName(folderName);
    await this.scrollIntoView(folderRow);

    const menuButtonSelectors = [
      'button:has([class*="Menu"])',
      '.more-actions-btn',
      'button[title="More Actions"]',
      'button:has(svg)',
    ];
    
    const actionMenuButton = await this.findElementWithFallback(
      folderRow,
      menuButtonSelectors,
      'button'
    ) || folderRow.locator('button').first();

    await actionMenuButton.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long });
    await this.scrollIntoView(actionMenuButton);
    await this.waitAndClick(actionMenuButton);
    await this.page.waitForTimeout(500);
    
    const menuContent = this.page.locator(this.locator('personDetailsMenuContent')).first();
    await menuContent.waitFor({ state: 'visible', timeout: this.TIMEOUTS.medium }).catch(async () => {
      await CoreLibrary.log.warning('[PersonDetailsPage] Menu content may not be visible');
    });
    await CoreLibrary.log.debug(`Action menu opened for folder: ${folderName}`);
  }
  
  /**
   * Helper: Scroll element into view and wait
   */
  private async scrollIntoView(locator: ReturnType<typeof this.page.locator>) {
    await locator.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(200);
  }
  
  /**
   * Helper: Find element using multiple selectors with fallback
   */
  private async findElementWithFallback(
    container: ReturnType<typeof this.page.locator>,
    selectors: string[],
    fallbackSelector?: string
  ) {
    for (const selector of selectors) {
      const element = container.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: this.TIMEOUTS.short }).catch(() => false);
      if (isVisible) return element;
    }
    return fallbackSelector ? container.locator(fallbackSelector).first() : null;
  }
  
  /**
   * Helper: Wait and click with fallback to force click
   */
  private async waitAndClick(locator: ReturnType<typeof this.page.locator>) {
    try {
      await locator.click({ timeout: 3000 });
    } catch {
      await locator.click({ force: true, timeout: 3000 });
    }
  }
  
  /**
   * Click "Request Upload" option in the folder action menu
   */
  async clickRequestUpload() {
    await CoreLibrary.log.step('Clicking Request Upload option');
    const requestUploadSelectors = [
      'text=Request Upload',
      'button:has-text("Request Upload")',
      '[role="menuitem"]:has-text("Request Upload")',
      '.popover-content:has-text("Request Upload")',
    ];
    
    let requestUploadOption = null;
    for (const selector of requestUploadSelectors) {
      const option = this.page.locator(selector).first();
      const isVisible = await option.isVisible({ timeout: this.TIMEOUTS.short }).catch(() => false);
      if (isVisible) {
        requestUploadOption = option;
        break;
      }
    }
    
    if (!requestUploadOption) {
      requestUploadOption = this.page.locator(this.locator('personDetailsFolderRequestUpload'));
    }
    
    await requestUploadOption.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long });
    await this.scrollIntoView(requestUploadOption);
    await this.waitAndClick(requestUploadOption);
    await this.waitForModalToLoad();
    await CoreLibrary.log.debug('Request Upload modal opened successfully');
  }
  
  /**
   * Helper: Wait for modal to load
   */
  private async waitForModalToLoad() {
    const modalContainer = this.page.locator(this.locator('personDetailsRequestModalContainer'));
    await modalContainer.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long });
    
    await Promise.race([
      this.page.locator(this.locator('personDetailsRequestModalHeading')).waitFor({ state: 'visible', timeout: this.TIMEOUTS.medium }),
      this.page.locator(this.locator('personDetailsRequestModalRequestTypeEmail')).waitFor({ state: 'attached', timeout: this.TIMEOUTS.medium }),
      this.page.locator(this.locator('personDetailsRequestModalForm')).waitFor({ state: 'visible', timeout: this.TIMEOUTS.medium }),
    ]).catch(async () => {
      await CoreLibrary.log.warning('[PersonDetailsPage] Modal content may not be fully loaded');
    });
    
    await this.page.waitForTimeout(500);
  }
  
  /**
   * Fill the Request Upload form
   * Handles both single email input and multiple emails (Recipient component) cases
   * @param data - Request upload data
   */
  async fillRequestUploadForm(data: {
    email: string;
    emailCC?: string;
    linkExpirationDays: number;
    message: string;
  }) {
    await CoreLibrary.log.step(`Filling request upload form with email: ${data.email}`);
    const modalContainer = this.page.locator(this.locator('personDetailsRequestModalContainer'));
    await modalContainer.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long });
    await this.scrollIntoView(modalContainer);
    await this.selectEmailRequestType(modalContainer);

    const hasRecipientComponent = await this.detectRecipientComponent(modalContainer);
    await CoreLibrary.log.debug(`Form type detected: ${hasRecipientComponent ? 'Recipient component (multiple emails)' : 'Single email input'}`);
    
    if (hasRecipientComponent) {
      await this.fillRecipientComponent(data, modalContainer);
    } else {
      await this.fillEmailWithFallback(data, modalContainer);
    }

    if (data.emailCC) {
      await this.fillCcEmail(modalContainer, data.emailCC);
    }

    await this.fillFormField(modalContainer, 'personDetailsRequestModalLinkExpirationInput', String(data.linkExpirationDays));
    await this.fillFormField(modalContainer, 'personDetailsRequestModalMessageTextarea', data.message);
    await CoreLibrary.log.debug('Request upload form filled successfully');
  }
  
  /**
   * Helper: Select Email as request type
   */
  private async selectEmailRequestType(modalContainer: ReturnType<typeof this.page.locator>) {
    const emailRadio = modalContainer.locator(this.locator('personDetailsRequestModalRequestTypeEmail'));
    await emailRadio.waitFor({ state: 'attached', timeout: this.TIMEOUTS.long });
    
    const isChecked = await emailRadio.isChecked().catch(() => false);
    if (!isChecked) {
      const emailLabel = modalContainer.locator(this.locator('personDetailsRequestModalEmailLabel')).first();
      const labelVisible = await emailLabel.isVisible({ timeout: this.TIMEOUTS.medium }).catch(() => false);
      
      if (labelVisible) {
        await emailLabel.click();
      } else {
        await emailRadio.check({ force: true });
      }
      await this.page.waitForTimeout(500);
    }
  }
  
  /**
   * Helper: Fill email with fallback strategies
   */
  private async fillEmailWithFallback(
    data: { email: string; emailCC?: string },
    modalContainer: ReturnType<typeof this.page.locator>
  ) {
    try {
      await this.fillSingleEmailInput(data, modalContainer);
    } catch (error: any) {
      await CoreLibrary.log.warning(`Single email input not found, forcing Recipient component detection: ${error.message}`);
      
      const hasRecipientFallback = await this.detectRecipientComponentAggressive(modalContainer);
      if (hasRecipientFallback) {
        await CoreLibrary.log.debug('Recipient component found in aggressive fallback, using it');
        await this.fillRecipientComponent(data, modalContainer);
      } else {
        const lastResortInput = await this.findEmailInputLastResort(modalContainer);
        if (lastResortInput) {
          await lastResortInput.fill(data.email);
          await CoreLibrary.log.debug('Found email input using last resort method');
        } else {
          throw error;
        }
      }
    }
  }
  
  /**
   * Helper: Fill CC email if visible
   */
  private async fillCcEmail(modalContainer: ReturnType<typeof this.page.locator>, emailCC: string) {
    const ccInput = modalContainer.locator(this.locator('personDetailsRequestModalCcInput')).first();
    const ccVisible = await ccInput.isVisible().catch(() => false);
    if (ccVisible) {
      await ccInput.fill(emailCC);
    }
  }
  
  /**
   * Helper: Fill form field by locator key
   */
  private async fillFormField(
    modalContainer: ReturnType<typeof this.page.locator>,
    locatorKey: string,
    value: string
  ) {
    const field = modalContainer.locator(this.locator(locatorKey));
    await field.waitFor({ state: 'visible', timeout: this.TIMEOUTS.medium });
    await field.fill(value);
  }
  
  /**
   * Detect if the modal uses Recipient component (multiple emails) or single email input
   */
  private async detectRecipientComponent(modalContainer: ReturnType<typeof this.page.locator>): Promise<boolean> {
    // Priority 1: Check for To/CC buttons directly (most reliable)
    const toButton = modalContainer.locator(this.RECIPIENT_SELECTORS.toButton[0]).first();
    const ccButton = modalContainer.locator(this.RECIPIENT_SELECTORS.ccButton).first();
    const hasToButton = await toButton.isVisible({ timeout: 2000 }).catch(() => false);
    const hasCcButton = await ccButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasToButton || hasCcButton) {
      await CoreLibrary.log.debug('Recipient component detected: Found To/CC buttons');
      return true;
    }
    
    // Priority 2: Check for ReactMultiEmail class
    const hasReactMultiEmailClass = await modalContainer.locator(this.RECIPIENT_SELECTORS.reactMultiEmail).first().isVisible({ timeout: 2000 }).catch(() => false);
    if (hasReactMultiEmailClass) {
      await CoreLibrary.log.debug('Recipient component detected: ReactMultiEmail class found');
      return true;
    }
    
    // Priority 3: Check for data-tag elements
    const hasDataTag = await modalContainer.locator(this.RECIPIENT_SELECTORS.dataTag).first().isVisible({ timeout: 2000 }).catch(() => false);
    if (hasDataTag) {
      await CoreLibrary.log.debug('Recipient component detected: ReactMultiEmail with data-tag elements');
      return true;
    }
    
    // Priority 4: Check for recipient container with buttons
    const recipientContainer = modalContainer.locator('div[class*="mb-2"]:has(button)').first();
    const isVisible = await recipientContainer.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isVisible) {
      const toButtonInContainer = recipientContainer.locator('button:has(div:has-text("To")):has([class*="RequiredAsterisk"])').first();
      const hasToButtonInContainer = await toButtonInContainer.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasToButtonInContainer) {
        await CoreLibrary.log.debug('Recipient component detected: To button in container');
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Aggressive detection for Recipient component (used as fallback)
   */
  private async detectRecipientComponentAggressive(modalContainer: ReturnType<typeof this.page.locator>): Promise<boolean> {
    await CoreLibrary.log.debug('Running aggressive Recipient component detection');
    
    const checks = [
      modalContainer.locator(this.RECIPIENT_SELECTORS.dataTag).first().isVisible({ timeout: 1000 }).catch(() => false),
      modalContainer.locator('button:has-text("To"), button:has-text("CC")').first().isVisible({ timeout: 1000 }).catch(() => false),
      modalContainer.locator(this.RECIPIENT_SELECTORS.reactMultiEmail).first().isVisible({ timeout: 1000 }).catch(() => false),
      modalContainer.locator(this.RECIPIENT_SELECTORS.multipleEmail).first().isVisible({ timeout: 1000 }).catch(() => false),
    ];
    
    const results = await Promise.all(checks);
    const hasAny = results.some(r => r === true);
    
    if (hasAny) {
      await CoreLibrary.log.debug('Recipient component detected via aggressive detection');
    }
    return hasAny;
  }
  
  /**
   * Last resort: find any email-like input in modal
   */
  private async findEmailInputLastResort(modalContainer: ReturnType<typeof this.page.locator>) {
    await CoreLibrary.log.debug('Trying last resort: finding any email input');
    
    // Try to find any input that might accept email
    const possibleInputs = [
      'input[type="text"]',
      'input[type="email"]',
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
      'textarea',
    ];
    
    for (const selector of possibleInputs) {
      try {
        const inputs = modalContainer.locator(selector);
        const count = await inputs.count();
        
        for (let i = 0; i < count; i++) {
          const input = inputs.nth(i);
          const isVisible = await input.isVisible({ timeout: 1000 }).catch(() => false);
          const isEnabled = await input.isEnabled().catch(() => false);
          const placeholder = await input.getAttribute('placeholder').catch(() => '') || '';
          const name = await input.getAttribute('name').catch(() => '') || '';
          
          // Skip if not visible/enabled
          if (!isVisible || !isEnabled) continue;
          
          // Prefer inputs with email-related attributes
          if (placeholder.toLowerCase().includes('email') || 
              name.toLowerCase().includes('email') ||
              placeholder.includes('Input multiple Email')) {
            await CoreLibrary.log.debug(`Found email input via last resort: ${selector}, placeholder="${placeholder}", name="${name}"`);
            return input;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }
  
  /**
   * Fill email(s) in Recipient component (multiple emails with ReactMultiEmail)
   */
  private async fillRecipientComponent(data: {
    email: string;
    emailCC?: string;
  }, modalContainer: ReturnType<typeof this.page.locator>) {
    await CoreLibrary.log.debug('Filling Recipient component');
    
    // Find To button using multiple selectors
    const toButton = await this.findToButton(modalContainer);
    const ccButton = modalContainer.locator(this.RECIPIENT_SELECTORS.ccButton).first();

    // Determine which tab is currently active
    const activeTab = await this.getActiveRecipientTab(toButton, ccButton);
    await CoreLibrary.log.debug(`Active tab: ${activeTab}`);

    // Fill email in the active tab (or switch to To if needed)
    if (activeTab !== 'to') {
      await CoreLibrary.log.debug('Switching to To tab');
      await toButton.click();
      await this.page.waitForTimeout(500);
    }

    // Fill email in To tab
    await CoreLibrary.log.debug(`Filling email in To tab: ${data.email}`);
    await this.fillEmailInRecipientTab('to', data.email, modalContainer);

    // Handle CC if provided
    if (data.emailCC) {
      const ccButtonVisible = await ccButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (ccButtonVisible) {
        await CoreLibrary.log.debug(`Filling CC email: ${data.emailCC}`);
        await ccButton.click();
        await this.page.waitForTimeout(500);
        await this.fillEmailInRecipientTab('cc', data.emailCC, modalContainer);
      }
    }
    
    await CoreLibrary.log.debug('Recipient component filled successfully');
  }
  
  /**
   * Get the currently active tab in Recipient component
   */
  private async getActiveRecipientTab(
    toButton: ReturnType<typeof this.page.locator>,
    ccButton: ReturnType<typeof this.page.locator>
  ): Promise<'to' | 'cc' | 'unknown'> {
    const toButtonClasses = await toButton.getAttribute('class').catch(() => '') || '';
    const ccButtonClasses = await ccButton.getAttribute('class').catch(() => '') || '';

    const toIsActive = toButtonClasses.includes('text') || !toButtonClasses.includes('link');
    const ccIsActive = ccButtonClasses.includes('text') || !ccButtonClasses.includes('link');

    if (toIsActive && !ccIsActive) {
      return 'to';
    } else if (ccIsActive && !toIsActive) {
      return 'cc';
    }

    // Fallback: check which input field is visible
    const modalContainer = this.page.locator(this.locator('personDetailsRequestModalContainer'));
    const visibleInput = await this.findVisibleRecipientInput(modalContainer);
    if (visibleInput) {
      const parentText = await visibleInput.evaluate((el: HTMLElement) => {
        let parent = el.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
          const text = parent.textContent || '';
          if (text.includes('To') && !text.includes('CC')) return 'to';
          if (text.includes('CC')) return 'cc';
          parent = parent.parentElement;
          depth++;
        }
        return null;
      }).catch(() => null);

      if (parentText === 'to') return 'to';
      if (parentText === 'cc') return 'cc';
    }

    return 'unknown';
  }
  
  /**
   * Find the visible email input in Recipient component (ReactMultiEmail)
   */
  private async findVisibleRecipientInput(modalContainer: ReturnType<typeof this.page.locator>) {
    await modalContainer.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(200);
    
    const reactMultiEmailSelectors = [
      'input[placeholder*="Input multiple Email addresses" i]',
      'div:has([data-tag]):not(.hidden) input[type="text"]',
      'div:has([data-tag]):not(.hidden) input[type="email"]',
      'form input[type="text"]:not([readonly]):not([disabled]):not([id*="search"]):not([id="search-input"])',
      'form input[type="email"]:not([readonly]):not([disabled]):not([id*="search"]):not([id="search-input"])',
    ];

    for (const selector of reactMultiEmailSelectors) {
      try {
        const inputs = modalContainer.locator(selector);
        const count = await inputs.count();
        
        for (let i = 0; i < count; i++) {
          const input = inputs.nth(i);
          
          const isVisible = await input.isVisible({ timeout: 1000 }).catch(() => false);
          if (!isVisible) continue;
          
          const isEnabled = await input.isEnabled().catch(() => false);
          if (!isEnabled) continue;
          
          const inputId = await input.getAttribute('id').catch(() => '') || '';
          const inputName = await input.getAttribute('name').catch(() => '') || '';
          const inputPlaceholder = await input.getAttribute('placeholder').catch(() => '') || '';
          
          if (inputId.includes('search') || inputName.includes('search') || inputId === 'search-input') {
            continue;
          }
          
          if (inputPlaceholder.toLowerCase().includes('email') || 
              inputName.toLowerCase().includes('email') ||
              inputPlaceholder.includes('Input multiple Email')) {
            return input;
          }
          
          return input;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }
  
  /**
   * Fill email in a specific Recipient tab (To or CC)
   */
  private async fillEmailInRecipientTab(tab: 'to' | 'cc', email: string, modalContainer: ReturnType<typeof this.page.locator>) {
    const modalContent = modalContainer.locator(this.locator('personDetailsModalFormContainer')).first();
    const activeTabContainer = modalContent.locator(`[class*="MultipleEmail"], [class*="react-multi-email"]:not(.hidden)`).first();
    const isActiveContainerVisible = await activeTabContainer.isVisible({ timeout: 3000 }).catch(() => false);
    
    let emailInput = null;
    
    if (isActiveContainerVisible) {
      emailInput = activeTabContainer.locator('input[type="text"], input[type="email"], input:not([type="hidden"])').first();
    } else {
      emailInput = await this.findVisibleRecipientInput(modalContainer);
    }

    if (!emailInput) {
      throw new Error(
        `Email input not found in Recipient component for ${tab} tab. ` +
        `Make sure the ${tab} tab is selected and modal is fully loaded.`
      );
    }

    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(200);

    const isEnabled = await emailInput.isEnabled().catch(() => false);
    if (!isEnabled) {
      throw new Error(`Email input is disabled in ${tab} tab`);
    }

    const isInViewport = await emailInput.evaluate((el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    }).catch(() => false);
    
    if (!isInViewport) {
      await emailInput.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300);
    }
    
    try {
      await emailInput.click({ timeout: 3000, force: true });
    } catch (error) {
      await emailInput.focus();
      await this.page.waitForTimeout(200);
    }
    await this.page.waitForTimeout(200);

    await emailInput.clear();
    await this.page.waitForTimeout(100);

    await emailInput.fill(email);
    await this.page.waitForTimeout(200);

    await emailInput.press('Enter');
    await this.page.waitForTimeout(500);

    const inputValue = await emailInput.inputValue().catch(() => '');
    if (inputValue === email) {
      await emailInput.press('Tab');
      await this.page.waitForTimeout(300);
    }
  }
  
  /**
   * Fill email in single email input field (InputField component)
   */
  private async fillSingleEmailInput(data: {
    email: string;
    emailCC?: string;
  }, modalContainer: ReturnType<typeof this.page.locator>) {
    await CoreLibrary.log.debug('Attempting to fill single email input');
    
    // Try multiple selectors for email input
    const allSelectors = [this.locator('personDetailsRequestModalEmailInput'), ...this.EMAIL_INPUT_SELECTORS];
    const emailInput = await this.findEmailInput(modalContainer, allSelectors);
    
    if (!emailInput) {
      await this.logModalForDebugging(modalContainer);
      throw new Error(
        `Email input not found in Request Upload modal. ` +
        `Tried selectors: ${allSelectors.join(', ')}. ` +
        `Modal may use Recipient component instead.`
      );
    }
    
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(data.email);
    await CoreLibrary.log.debug(`Email filled: ${data.email}`);

    if (data.emailCC) {
      const ccInput = modalContainer.locator(this.locator('personDetailsRequestModalCcInput'));
      const ccVisible = await ccInput.isVisible({ timeout: 3000 }).catch(() => false);
      if (ccVisible) {
        await ccInput.fill(data.emailCC);
        await CoreLibrary.log.debug(`CC email filled: ${data.emailCC}`);
      }
    }
  }
  
  /**
   * Submit the Request Upload form
   * Captures requestDocumentId and secretKey from API response
   * @returns Object with requestDocumentId and secretKey
   */
  async submitRequestUpload(): Promise<{ requestDocumentId: string; secretKey: string } | null> {
    await CoreLibrary.log.step('Submitting request upload form');
    let requestDocumentData: { requestDocumentId: string; secretKey: string } | null = null;
    let capturedRequestId: string | null = null;
    
    const responseListener = async (response: any) => {
      const url = response.url();
      if (
        (url.includes('/request-upload-document') || url.includes('/request-upload-document')) &&
        response.request().method() === 'POST' &&
        response.status() === 200 &&
        !requestDocumentData
      ) {
        try {
          const json = await response.json();
          if (json._id && json.secretKey) {
            requestDocumentData = {
              requestDocumentId: json._id.toString(),
              secretKey: json.secretKey
            };
            capturedRequestId = json._id.toString();
            CoreLibrary.log.debug(
              `[PersonDetailsPage] Captured request document: ${capturedRequestId}, secretKey: ${requestDocumentData.secretKey.substring(0, 4)}...`
            );
          }
        } catch (e) {
          CoreLibrary.log.warning(`[PersonDetailsPage] Failed to parse request document response: ${e}`);
        }
      }
    };
    
    this.page.on('response', responseListener);

    // Find submit button within the modal
    const modalContainer = this.page.locator(this.locator('personDetailsRequestModalContainer'));
    const submitButton = modalContainer.locator(this.locator('personDetailsRequestModalSubmitButton')).first();
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await CoreLibrary.log.debug('Clicking submit button');
    await submitButton.click();

    // Wait for API response
    const maxWaitMs = this.TIMEOUTS.veryLong;
    const pollIntervalMs = 250;
    let waited = 0;
    while (!requestDocumentData && waited < maxWaitMs) {
      await this.page.waitForTimeout(pollIntervalMs);
      waited += pollIntervalMs;
    }

    this.page.off('response', responseListener);

    if (!requestDocumentData) {
      const errorToast = this.page.locator(this.locator('errorToast')).first();
      const errorVisible = await errorToast.isVisible({ timeout: 3000 }).catch(() => false);
      if (errorVisible) {
        const errorText = await errorToast.textContent().catch(() => 'Unknown error');
        throw new Error(`Request document upload failed: ${errorText}`);
      }
      throw new Error(
        `Failed to capture request document data from API response. ` +
        `The request may have failed or the response format changed.`
      );
    }

    // Wait for modal to close
    await modalContainer.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Modal might close quickly
    });

    // Wait for success toast (optional)
    const toastLocator = this.page.locator(this.locator('personDetailsRequestSuccessToast'));
    await toastLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
      await CoreLibrary.log.warning('[PersonDetailsPage] Success toast not found, but request document data was captured');
    });

    // Log success if we have the data
    if (capturedRequestId) {
      await CoreLibrary.log.pass(`Request upload submitted successfully. RequestDocumentId: ${capturedRequestId}`);
    }
    return requestDocumentData;
  }
  
  /**
   * High-level method to request document upload for a folder
   * @param folderName - The folder name (e.g., "CV")
   * @param data - Request upload data
   * @returns Object with requestDocumentId and secretKey (if captured from API)
   */
  async requestDocumentUpload(
    folderName: string,
    data: {
      email: string;
      emailCC?: string;
      linkExpirationDays: number;
      message: string;
    }
  ): Promise<{ requestDocumentId: string; secretKey: string } | null> {
    await CoreLibrary.log.step(`Requesting document upload for folder: ${folderName}`);
    // Navigate to Documents tab if not already there
    await this.navigateToDocumentsTab();

    // Open folder action menu
    await this.openFolderActionMenu(folderName);

    // Click Request Upload
    await this.clickRequestUpload();

    // Fill form
    await this.fillRequestUploadForm(data);

    // Submit and capture requestDocumentId + secretKey
    const requestData = await this.submitRequestUpload();
    
    await CoreLibrary.log.pass(`Document upload requested successfully for folder: ${folderName}`);
    return requestData;
  }
  
  /**
   * Verify person details on the Person Details page
   * Checks that the form displays the correct person information
   * @param expectedData - Expected person data (firstName, lastName, middleName optional)
   */
  async verifyPersonDetails(expectedData: {
    firstName: string;
    lastName: string;
    middleName?: string;
  }) {
    await CoreLibrary.log.step(`Verifying person details: ${expectedData.firstName} ${expectedData.lastName}`);
    await this.safeWaitForLoadState();
    await expect(this.page).toHaveURL(/\/lobby\/edit-person\/[^/]+/);

    await this.verifyField('personDetailsFormFirstNameInput', 'First name', expectedData.firstName);
    await this.verifyField('personDetailsFormLastNameInput', 'Last name', expectedData.lastName);
    
    if (expectedData.middleName) {
      await this.verifyField('personDetailsFormMiddleNameInput', 'Middle name', expectedData.middleName);
    }
    
    await CoreLibrary.log.pass('Person details verified successfully');
  }
  
  /**
   * Helper: Verify form field value
   */
  private async verifyField(locatorKey: string, fieldName: string, expectedValue: string) {
    const actualValue = await this.page.locator(this.locator(locatorKey)).inputValue();
    await CoreLibrary.log.debug(`${fieldName}: expected="${expectedValue}", actual="${actualValue}"`);
    expect(actualValue).toBe(expectedValue);
  }
  
  /**
   * Verify that a document appears in a folder
   * @param folderName - The folder name
   * @param documentName - The document name to verify (optional)
   */
  async verifyDocumentInFolder(
    folderName: string,
    documentName?: string
  ) {
    await CoreLibrary.log.step(`Verifying document in folder: ${folderName}${documentName ? `, document: ${documentName}` : ''}`);
    // Navigate to Documents tab if not already there
    await this.navigateToDocumentsTab();

    // Locate folder
    const folderRow = await this.locateFolderByName(folderName);

    if (documentName) {
      await this.expandFolderIfNeeded(folderRow, folderName, documentName);
      await this.verifyDocumentExists(documentName, folderName);
    } else {
      await expect(folderRow).toBeVisible();
      await CoreLibrary.log.pass(`Folder "${folderName}" verified successfully`);
    }
  }
  
  /**
   * Helper: Expand folder if needed
   */
  private async expandFolderIfNeeded(
    folderRow: ReturnType<typeof this.page.locator>,
    folderName: string,
    documentName: string
  ) {
    await CoreLibrary.log.debug(`Checking if folder "${folderName}" needs to be expanded`);
    await this.scrollIntoView(folderRow);
    
    const isExpanded = await this.checkFolderExpanded(folderRow, folderName, documentName);
    
    if (!isExpanded) {
      await CoreLibrary.log.debug(`Folder "${folderName}" is collapsed, clicking to expand...`);
      await folderRow.click({ position: { x: 50, y: 10 } });
      await this.page.waitForTimeout(1000);
    } else {
      await CoreLibrary.log.debug(`Folder "${folderName}" is already expanded, skipping click`);
    }
  }
  
  /**
   * Helper: Check if folder is expanded
   */
  private async checkFolderExpanded(
    folderRow: ReturnType<typeof this.page.locator>,
    folderName: string,
    documentName: string
  ): Promise<boolean> {
    const chevronIcon = folderRow.locator(this.locator('personDetailsFolderChevronIcon')).first();
    const chevronExists = await chevronIcon.isVisible({ timeout: this.TIMEOUTS.short }).catch(() => false);
    
    if (chevronExists) {
      const chevronClass = await chevronIcon.getAttribute('class').catch(() => '') || '';
      const isExpanded = !chevronClass.includes('-rotate-90');
      await CoreLibrary.log.debug(`Folder "${folderName}" chevron state: ${isExpanded ? 'expanded (no -rotate-90)' : 'collapsed (has -rotate-90)'}`);
      return isExpanded;
    }
    
    // Fallback: check if document is visible
    const documentCheck = folderRow.locator('..').locator(`text="${documentName}"`).first();
    const docVisible = await documentCheck.isVisible({ timeout: 1000 }).catch(() => false);
    await CoreLibrary.log.debug(`No chevron found, checking document visibility: ${docVisible ? 'visible (folder likely expanded)' : 'not visible (folder likely collapsed)'}`);
    return docVisible;
  }
  
  /**
   * Helper: Verify document exists in folder
   */
  private async verifyDocumentExists(documentName: string, folderName: string) {
    await CoreLibrary.log.debug(`Looking for document: ${documentName}`);
    const documentLocator = this.page
      .locator(this.locator('personDetailsFolderTreeContainer'))
      .locator(`text="${documentName}"`)
      .first();
    
    await documentLocator.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long });
    await CoreLibrary.log.pass(`Document "${documentName}" found in folder "${folderName}"`);
  }
  
  /**
   * Find To button in modal using multiple selectors
   */
  private async findToButton(modalContainer: ReturnType<typeof this.page.locator>) {
    for (const selector of this.RECIPIENT_SELECTORS.toButton) {
      const button = modalContainer.locator(selector).first();
      const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) {
        await CoreLibrary.log.debug(`Found To button with selector: ${selector}`);
        return button;
      }
    }
    throw new Error(`To button not found. Tried selectors: ${this.RECIPIENT_SELECTORS.toButton.join(', ')}`);
  }
  
  /**
   * Find email input using multiple selectors
   */
  private async findEmailInput(modalContainer: ReturnType<typeof this.page.locator>, selectors: string[]) {
    for (const selector of selectors) {
      try {
        const input = modalContainer.locator(selector).first();
        const isVisible = await input.isVisible({ timeout: 2000 }).catch(() => false);
        if (isVisible) {
          await CoreLibrary.log.debug(`Found email input with selector: ${selector}`);
          return input;
        }
      } catch {
        continue;
      }
    }
    return null;
  }
  
  /**
   * Log modal HTML for debugging
   */
  private async logModalForDebugging(modalContainer: ReturnType<typeof this.page.locator>) {
    try {
      const modalHtml = await modalContainer.innerHTML().catch(() => 'Could not get modal HTML');
      await CoreLibrary.log.debug(`Modal HTML (first 1000 chars): ${modalHtml.substring(0, 1000)}`);
    } catch {
      // Ignore
    }
  }
}

