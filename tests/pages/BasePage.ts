import { IPlaywrightLibrary } from '@core';
import { Page } from '@playwright/test';
import PropertiesReader from 'properties-reader';

/**
 * BasePage - Base class cho tất cả page objects
 * 
 * Features:
 * - Load locators từ properties files vào local Map (parallel-safe)
 * - Provide common methods (goto, locator)
 * - Thread-safe: mỗi instance có locators riêng
 */
export abstract class BasePage {
  protected locators: Map<string, string> = new Map();
  
  constructor(
    protected qe: IPlaywrightLibrary,
    protected page: Page
  ) {
    this.loadLocators(this.getPropertiesFile());
  }
  
  /**
   * Subclass phải implement method này để return tên properties file (không có extension)
   * Example: return 'login' cho login.properties
   */
  protected abstract getPropertiesFile(): string;
  
  /**
   * Load locators từ properties file vào local Map
   * Sử dụng local Map để đảm bảo parallel execution safety
   */
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
  
  /**
   * Get locator selector từ key
   * @param key - Locator key trong properties file
   * @returns CSS selector string
   */
  protected locator(key: string): string {
    const selector = this.locators.get(key);
    if (!selector) {
      throw new Error(
        `Locator key "${key}" not found in ${this.getPropertiesFile()}.properties`
      );
    }
    return selector;
  }
  
  /**
   * Navigate to path (relative to baseURL)
   * @param path - Relative path (e.g., '/login', '/lobby/persons')
   */
  protected async goto(path: string) {
    const baseUrl = this.qe.envProps.get('baseUrl') || 'http://127.0.0.1:3000';
    await this.page.goto(`${baseUrl}${path}`);;
    try {
      await this.page.waitForLoadState('networkidle');
    } catch {
      // Ignore networkidle timeout
    }
  }

  /**
   * Wait for URL pathname to change from specified pathname(s)
   * 
   * Pattern: Follows WaitUtil pattern with timeout and interval from projectProps
   * Similar to WaitUtil.waitForVisibility() implementation
   * 
   * This method is useful for waiting for redirects to complete before checking pathname.
   * Used in BaseFlow.handle2FAIfNeeded() and BaseFlow.verifyAuthenticated().
   * 
   * Note: Made public to allow access from BaseFlow and other non-subclass contexts.
   * 
   * @param fromPathnames - Single pathname string or array of pathnames to wait for change from
   * @param waitTime - Maximum wait time in milliseconds (default: from projectProps.waitForTimeout or 10000)
   * @param interval - Interval between checks in milliseconds (default: from projectProps.interval or 200)
   * @returns The current pathname after it has changed
   */
  public async waitForPathnameChange(
    fromPathnames: string | string[],
    waitTime?: number,
    interval?: number
  ): Promise<string> {
    const pathnamesToCheck = Array.isArray(fromPathnames) ? fromPathnames : [fromPathnames];
    
    // Use framework defaults from projectProps (similar to WaitUtil pattern)
    const defaultWaitTime = this.qe.projectProps?.waitForTimeout || 10000;
    const defaultInterval = this.qe.projectProps?.interval || 200;
    
    let currentTimeout: number = waitTime || defaultWaitTime;
    const currentInterval: number = interval || defaultInterval;

    while (currentTimeout > 0) {
      const currentUrl = this.page.url();
      const pathname = new URL(currentUrl).pathname;

      // If we're no longer on any of the specified pathnames, return current pathname
      if (!pathnamesToCheck.includes(pathname)) {
        return pathname;
      }

      // Wait for interval (using framework's wait utility)
      await this.qe.wait.duration(currentInterval);
      currentTimeout -= currentInterval;
    }

    // Timeout reached, return current pathname anyway
    const currentUrl = this.page.url();
    return new URL(currentUrl).pathname;
  }
}

