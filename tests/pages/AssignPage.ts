import { BasePage } from './BasePage';
import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class AssignPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'assign';
  }
  
  async goto() {
    await super.goto('/lobby/assign-to-me');
    await this.qe.wait.forDisplayed(this.locator('pageTitle'));
  }
  
  async waitForTable() {
    await this.qe.wait.forDisplayed(this.locator('table'));
  }
  
  async getTableRowCount(): Promise<number> {
    const rows = await this.page.locator(this.locator('tableRow')).count();
    return rows;
  }
  
  async openAndVerifyOverview() {
    await this.goto();
    await this.waitForTable();
    const rowCount = await this.getTableRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  }
}

