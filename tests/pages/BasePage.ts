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
}

