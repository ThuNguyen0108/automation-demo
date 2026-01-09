import { BasePage } from './BasePage';
import { IPlaywrightLibrary, CoreLibrary } from '@core';
import { Page } from '@playwright/test';
import { captureDOMSnapshot } from '@playwrightUtils';

export class PersonsPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'persons';
  }
  
  async goto() {
    await super.goto('/lobby/persons');
    await this.qe.wait.forDisplayed(this.locator('pageTitle'));
  }
  
  async waitForPageLoad() {
    await this.page.waitForURL(/\/lobby\/persons/, { timeout: 10000 });
    await this.qe.wait.forDisplayed(this.locator('pageTitle'));
  }
  
  async clickAddNewPerson() {
    await this.waitForPageLoad();
    const desktopButton = this.page.locator(this.locator('addNewPersonButton'));
    const isDesktopButtonVisible = await desktopButton
      .waitFor({ state: "visible", timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (isDesktopButtonVisible) {
      await desktopButton.waitFor({ state: "attached" });
      const isDisabled = await desktopButton.isDisabled().catch(() => false);
      if (isDisabled) {
        throw new Error(
          "Add new person button is disabled. User may not have permission to create persons."
        );
      }
      
      await this.qe.ui.click(this.locator('addNewPersonButton'));
    } else {
      await this.page.locator(this.locator('actionMenuButton')).waitFor({ state: "visible", timeout: 10000 });
      await this.qe.ui.click(this.locator('actionMenuButton'));
      await this.page.waitForTimeout(500);
      await this.qe.ui.click(this.locator('actionMenuAddNewPerson'));
    }

    const modalTitle = this.page.locator(this.locator('createModalTitle'));
    const modalContainer = this.page.locator(this.locator('createModalContainer'));
    const firstNameInput = this.page.locator(this.locator('createModalFirstNameInput'));
    await Promise.race([
      modalTitle.waitFor({ state: "visible", timeout: 15000 }),
      modalContainer.waitFor({ state: "visible", timeout: 15000 }),
      firstNameInput.waitFor({ state: "visible", timeout: 15000 }),
    ]).catch((error) => {
      throw new Error(
        `Modal did not appear after clicking "Add new person". ` +
          `This could mean: button didn't click, modal failed to open, or locators are incorrect. ` +
          `Original error: ${error.message}`
      );
    });
  }
  
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
  
  async submitCreatePersonForm() {
    await this.qe.ui.click(this.locator('createModalCreateButton'));
    await this.qe.wait.forDisplayed(this.locator('createSuccessToast'), 15000);
    await this.page.waitForURL(/\/lobby\/edit-person\//, { timeout: 15000 });
  }
  
  async createPersonSuccessfully(personData: {
    firstName: string;
    lastName: string;
    middleName?: string;
  }): Promise<{ personId: string; actualFirstName: string }> {
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/lobby/persons')) {
      await this.goto();
      await this.waitForPageLoad();
    }
    
    const timestamp = Date.now();
    const uniqueFirstName = `[AUTO] ${personData.firstName} e2e-${timestamp}`;
    const personDataWithUniqueName = {
      ...personData,
      firstName: uniqueFirstName,
    };
    
    await this.clickAddNewPerson();
    await this.fillCreatePersonForm(personDataWithUniqueName);
    await this.submitCreatePersonForm();
    
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

  private async searchAndFindPersonCard(fullName: string) {
    await CoreLibrary.log.step(`Searching for: ${fullName}`);
    
    const searchInput = this.page.locator(this.locator('searchInput')).first();
    await searchInput.clear();
    await searchInput.fill(fullName);
    await this.page.waitForTimeout(2000);
    await searchInput.press('Escape');
    await this.page.waitForTimeout(500);
    
    const personsGrid = this.page.locator(this.locator('personsGrid'));
    await personsGrid.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(2000);
    
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
    
    try {
      const gridElement = this.page.locator('[id="tour_dashboard_persons"]');
      if (await gridElement.isVisible().catch(() => false)) {
        await captureDOMSnapshot(this.page, 'deletePersonByName-failure-grid', '[id="tour_dashboard_persons"]');
      }
    } catch (err) {
    }
    
    throw new Error(`Could not find person card with name: ${fullName}`);
  }

  private async clickDeleteButton(personCard: ReturnType<typeof this.page.locator>, fullName: string) {
    await CoreLibrary.log.step('Clicking delete button...');
    
    const deleteButton = personCard.locator(this.locator('personCardDeleteButton'));
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await deleteButton.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    
    await deleteButton.click({ force: true });
    await this.page.waitForTimeout(500);
    
    if (this.page.url().includes('/lobby/edit-person/')) {
      await CoreLibrary.log.warning('Navigated to detail page, going back...');
      await this.page.goBack();
      await this.waitForPageLoad();
      const retryCard = await this.searchAndFindPersonCard(fullName);
      const retryButton = retryCard.locator(this.locator('personCardDeleteButton'));
      await retryButton.click({ force: true, position: { x: 5, y: 5 } });
      await this.page.waitForTimeout(500);
    }
  }

  private async confirmDeleteInModal() {
    await CoreLibrary.log.step('Waiting for delete confirmation modal...');
    await this.page.waitForTimeout(500);
    
    const deleteModal = this.page.locator(this.locator('deleteModal')).first();
    
    try {
      await deleteModal.waitFor({ state: 'visible', timeout: 10000 });
      await CoreLibrary.log.debug('Delete modal found');
    } catch (error) {
      await CoreLibrary.log.debug('Modal not found, capturing DOM snapshot for debugging...');
      try {
        await captureDOMSnapshot(this.page, 'delete-modal-not-found', 'body');
        await CoreLibrary.log.debug('Captured DOM snapshot: delete-modal-not-found');
      } catch (err) {
        await CoreLibrary.log.warning(`Failed to capture DOM snapshot: ${err}`);
      }
      throw new Error(`Delete confirmation modal not found: ${error}`);
    }
    
    await CoreLibrary.log.step('Confirming deletion...');
    const confirmButton = deleteModal.locator(this.locator('deleteModalConfirmButton'));
    
    try {
      await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
      await confirmButton.click();
    } catch (error) {
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

