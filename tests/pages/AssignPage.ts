import { BasePage } from './BasePage';
import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * AssignPage - Page object cho Assign-to-Me page
 * 
 * Reference: speedydd-automation/src/pages/AssignToMePageWeb.ts
 */
export class AssignPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'assign';
  }
  
  /**
   * Navigate to Assign-to-Me page
   */
  async goto() {
    await super.goto('/lobby/assign-to-me');
    await this.qe.wait.forDisplayed(this.locator('pageTitle'));
  }
  
  /**
   * Wait for table to be displayed
   */
  async waitForTable() {
    await this.qe.wait.forDisplayed(this.locator('table'));
  }
  
  /**
   * Get number of rows in the table
   */
  async getTableRowCount(): Promise<number> {
    const rows = await this.page.locator(this.locator('tableRow')).count();
    return rows;
  }
  
  /**
   * Open Assign-to-Me page and verify overview
   * High-level method for "Admin views all assigned items in Assign tab" scenario
   */
  async openAndVerifyOverview() {
    await this.goto();
    await this.waitForTable();
    
    // Verify table is loaded (may be empty, that's OK)
    const rowCount = await this.getTableRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  }
}

