import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import PropertiesReader from 'properties-reader';

export abstract class BasePage {
  protected locators: Map<string, string> = new Map();
  
  constructor(
    protected qe: IPlaywrightLibrary,
    protected page: Page
  ) {
    this.loadLocators(this.getPropertiesFile());
  }
  
  protected abstract getPropertiesFile(): string;
  
  private loadLocators(propertiesFile: string) {
    const basePath = this.qe.paths.sanitizeDirectory(
      this.qe.projectProps.baseObjectPath
    );
    const filePath = this.qe.files.getMatchingFilesPath(
      basePath,
      `${propertiesFile}.properties`
    );
    
    if (!filePath) {
      throw new Error(
        `Properties file "${propertiesFile}.properties" not found in ${basePath}`
      );
    }
    
    const properties = PropertiesReader(filePath);
    const props = properties.getAllProperties();
    
    Object.entries(props).forEach(([key, value]) => {
      this.locators.set(key, value as string);
    });
  }
  
  protected locator(key: string): string {
    const selector = this.locators.get(key);
    if (!selector) {
      throw new Error(
        `Locator key "${key}" not found in ${this.getPropertiesFile()}.properties`
      );
    }
    return selector;
  }
  
  protected async goto(path: string) {
    const baseUrl = this.qe.envProps.get('baseUrl') || 'http://127.0.0.1:3000';
    await this.page.goto(`${baseUrl}${path}`);;
    try {
      await this.page.waitForLoadState('networkidle');
    } catch {
    }
  }

  public async waitForPathnameChange(
    fromPathnames: string | string[],
    waitTime?: number,
    interval?: number
  ): Promise<string> {
    const pathnamesToCheck = Array.isArray(fromPathnames) ? fromPathnames : [fromPathnames];
    const defaultWaitTime = this.qe.projectProps?.waitForTimeout || 10000;
    const defaultInterval = this.qe.projectProps?.interval || 200;
    let currentTimeout: number = waitTime || defaultWaitTime;
    const currentInterval: number = interval || defaultInterval;

    while (currentTimeout > 0) {
      const currentUrl = this.page.url();
      const pathname = new URL(currentUrl).pathname;
      if (!pathnamesToCheck.includes(pathname)) {
        return pathname;
      }
      await this.qe.wait.duration(currentInterval);
      currentTimeout -= currentInterval;
    }

    const currentUrl = this.page.url();
    return new URL(currentUrl).pathname;
  }
}

