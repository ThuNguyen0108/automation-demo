import { BasePage } from './BasePage';
import { IPlaywrightLibrary, CoreLibrary } from '@core';
import { Page } from '@playwright/test';
import { captureDOMSnapshot } from '@playwrightUtils';

/**
 * PersonsPage - Page object cho Persons page
 * 
 * Reference: speedydd-automation/src/pages/PersonsPageWeb.ts
 */
export class PersonsPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'persons';
  }
  
  /**
   * Navigate to Persons page
   */
  async goto() {
    await super.goto('/lobby/persons');
    await this.qe.wait.forDisplayed(this.locator('pageTitle'));
  }
  
  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForURL(/\/lobby\/persons/, { timeout: 10000 });
    await this.qe.wait.forDisplayed(this.locator('pageTitle'));
  }
  
  /**
   * Click Add New Person button
   * Handles both desktop (direct button) and mobile (Action menu) cases
   */
  async clickAddNewPerson() {
    // Wait for page to be fully loaded first
    await this.waitForPageLoad();

    // Try desktop button first
    const desktopButton = this.page.locator(this.locator('addNewPersonButton'));
    
    // Wait for button to be visible and enabled
    const isDesktopButtonVisible = await desktopButton
      .waitFor({ state: "visible", timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (isDesktopButtonVisible) {
      // Wait for button to be enabled (not disabled)
      await desktopButton.waitFor({ state: "attached" });
      const isDisabled = await desktopButton.isDisabled().catch(() => false);
      if (isDisabled) {
        throw new Error(
          "Add new person button is disabled. User may not have permission to create persons."
        );
      }
      
      await this.qe.ui.click(this.locator('addNewPersonButton'));
    } else {
      // Mobile/tablet: open Action menu first
      await this.page.locator(this.locator('actionMenuButton')).waitFor({ state: "visible", timeout: 10000 });
      await this.qe.ui.click(this.locator('actionMenuButton'));
      // Wait a bit for menu to open
      await this.page.waitForTimeout(500);
      await this.qe.ui.click(this.locator('actionMenuAddNewPerson'));
    }

    // Wait for modal to appear (increase timeout for slow networks)
    // Try multiple locators in case modal structure varies
    const modalTitle = this.page.locator(this.locator('createModalTitle'));
    const modalContainer = this.page.locator(this.locator('createModalContainer'));
    const firstNameInput = this.page.locator(this.locator('createModalFirstNameInput'));
    
    // Wait for any of these to appear (modal is loaded when any of these is visible)
    await Promise.race([
      modalTitle.waitFor({ state: "visible", timeout: 15000 }),
      modalContainer.waitFor({ state: "visible", timeout: 15000 }),
      firstNameInput.waitFor({ state: "visible", timeout: 15000 }),
    ]).catch((error) => {
      // If all fail, throw a more helpful error
      throw new Error(
        `Modal did not appear after clicking "Add new person". ` +
          `This could mean: button didn't click, modal failed to open, or locators are incorrect. ` +
          `Original error: ${error.message}`
      );
    });
  }
  
  /**
   * Fill Create Person form
   */
  async fillCreatePersonForm(personData: {
    firstName: string;
    lastName: string;
    middleName?: string;
  }) {
    await this.qe.ui.fill(this.locator('createModalFirstNameInput'), personData.firstName);
    await this.qe.ui.fill(this.locator('createModalLastNameInput'), personData.lastName);
    if (personData.middleName) {
      await this.qe.ui.fill(this.locator('createModalMiddleNameInput'), personData.middleName);
    }
  }
  
  /**
   * Submit Create Person form
   */
  async submitCreatePersonForm() {
    await this.qe.ui.click(this.locator('createModalCreateButton'));
    
    // Wait for success toast
    await this.qe.wait.forDisplayed(this.locator('createSuccessToast'), 15000);
    
    // Wait for navigation to person details page
    await this.page.waitForURL(/\/lobby\/edit-person\//, { timeout: 15000 });
  }
  
  /**
   * Create a new person successfully
   * Automatically adds [AUTO] prefix to firstName to avoid conflicts
   * 
   * @param personData - Person data (firstName and lastName are required)
   * @returns Object with personId and actualFirstName (with [AUTO] prefix)
   */
  async createPersonSuccessfully(personData: {
    firstName: string;
    lastName: string;
    middleName?: string;
  }): Promise<{ personId: string; actualFirstName: string }> {
    // Navigate to persons page if not already there
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/lobby/persons')) {
      await this.goto();
      await this.waitForPageLoad();
    }
    
    // Generate unique firstName with [AUTO] prefix (preserve logic từ PersonsPageWeb)
    const timestamp = Date.now();
    const uniqueFirstName = `[AUTO] ${personData.firstName} e2e-${timestamp}`;
    const personDataWithUniqueName = {
      ...personData,
      firstName: uniqueFirstName,
    };
    
    // Open create modal
    await this.clickAddNewPerson();
    
    // Fill form
    await this.fillCreatePersonForm(personDataWithUniqueName);
    
    // Submit
    await this.submitCreatePersonForm();
    
    // Extract person ID from URL
    const urlMatch = this.page.url().match(/\/lobby\/edit-person\/([^/]+)/);
    if (!urlMatch || !urlMatch[1]) {
      throw new Error(`Failed to extract person ID from URL: ${this.page.url()}`);
    }
    
    const personId = urlMatch[1];
    
    return {
      personId,
      actualFirstName: uniqueFirstName
    };
  }
  
  /**
   * Delete person by full name
   * Searches for person and deletes it from the card (delete button is on the card)
   * 
   * @param fullName - Full name to search for (e.g., "[AUTO] John Test Doe")
   */
  async deletePersonByName(fullName: string) {
    await CoreLibrary.log.debug(`Starting deletion for: ${fullName}`);
    
    await this.goto();
    await this.waitForPageLoad();
    
    const personCard = await this.searchAndFindPersonCard(fullName);
    await this.clickDeleteButton(personCard, fullName);
    await this.confirmDeleteInModal();
    
    await this.qe.wait.forDisplayed(this.locator('deleteSuccessToast'), 15000);
    await this.page.waitForTimeout(1000);
    await CoreLibrary.log.pass(`Deletion completed successfully for: ${fullName}`);
  }

  /**
   * Search for person and find their card
   */
  private async searchAndFindPersonCard(fullName: string) {
    await CoreLibrary.log.step(`Searching for: ${fullName}`);
    
    const searchInput = this.page.locator(this.locator('searchInput')).first();
    await searchInput.clear();
    await searchInput.fill(fullName);
    await this.page.waitForTimeout(2000); // Wait for debounce + API call
    await searchInput.press('Escape');
    await this.page.waitForTimeout(500);
    
    const personsGrid = this.page.locator(this.locator('personsGrid'));
    await personsGrid.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(2000); // Wait for cards to render
    
    const allCards = personsGrid.locator('div.rounded-2xl');
    const cardCount = await allCards.count();
    
    if (cardCount === 0) {
      throw new Error('No cards found in grid');
    }
    
    for (let i = 0; i < cardCount; i++) {
      const card = allCards.nth(i);
      const cardText = await card.textContent();
      if (cardText && cardText.includes(fullName)) {
        await CoreLibrary.log.debug(`Person card found at index ${i}`);
        return card;
      }
    }
    
    // Capture DOM snapshot for debugging
    try {
      const gridElement = this.page.locator('[id="tour_dashboard_persons"]');
      if (await gridElement.isVisible().catch(() => false)) {
        await captureDOMSnapshot(this.page, 'deletePersonByName-failure-grid', '[id="tour_dashboard_persons"]');
      }
    } catch (err) {
      // Ignore
    }
    
    throw new Error(`Could not find person card with name: ${fullName}`);
  }

  /**
   * Click delete button on person card
   */
  private async clickDeleteButton(personCard: ReturnType<typeof this.page.locator>, fullName: string) {
    await CoreLibrary.log.step('Clicking delete button...');
    
    const deleteButton = personCard.locator(this.locator('personCardDeleteButton'));
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await deleteButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    
    await deleteButton.click({ force: true });
    await this.page.waitForTimeout(500);
    
    // Verify we didn't navigate to detail page
    if (this.page.url().includes('/lobby/edit-person/')) {
      await CoreLibrary.log.warning('Navigated to detail page, going back...');
      await this.page.goBack();
      await this.waitForPageLoad();
      // Re-find and click
      const retryCard = await this.searchAndFindPersonCard(fullName);
      const retryButton = retryCard.locator(this.locator('personCardDeleteButton'));
      await retryButton.click({ force: true, position: { x: 5, y: 5 } });
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Wait for and find delete confirmation modal
   */
  private async confirmDeleteInModal() {
    await CoreLibrary.log.step('Waiting for delete confirmation modal...');
    await this.page.waitForTimeout(500);
    
    // Find modal using locator from properties
    const deleteModal = this.page.locator(this.locator('deleteModal')).first();
    
    try {
      await deleteModal.waitFor({ state: 'visible', timeout: 10000 });
      await CoreLibrary.log.debug('Delete modal found');
    } catch (error) {
      // Capture DOM snapshot for debugging
      await CoreLibrary.log.debug('Modal not found, capturing DOM snapshot for debugging...');
      try {
        await captureDOMSnapshot(this.page, 'delete-modal-not-found', 'body');
        await CoreLibrary.log.debug('Captured DOM snapshot: delete-modal-not-found');
      } catch (err) {
        await CoreLibrary.log.warning(`Failed to capture DOM snapshot: ${err}`);
      }
      throw new Error(`Delete confirmation modal not found: ${error}`);
    }
    
    // Chain locator from modal to find confirm button inside modal
    await CoreLibrary.log.step('Confirming deletion...');
    const confirmButton = deleteModal.locator(this.locator('deleteModalConfirmButton'));
    
    try {
      await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
      await confirmButton.click();
    } catch (error) {
      // Capture DOM snapshot of modal for debugging button not found
      await CoreLibrary.log.debug('Confirm button not found in modal, capturing modal DOM...');
      try {
        await captureDOMSnapshot(this.page, 'delete-modal-button-not-found', this.locator('deleteModal'));
        await CoreLibrary.log.debug('Captured modal DOM snapshot: delete-modal-button-not-found');
      } catch (err) {
        await CoreLibrary.log.warning(`Failed to capture modal DOM snapshot: ${err}`);
      }
      throw new Error(`Delete confirm button not found in modal: ${error}`);
    }
  }
}

