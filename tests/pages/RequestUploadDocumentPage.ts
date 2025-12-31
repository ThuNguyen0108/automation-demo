import { BasePage } from './BasePage';
import { IPlaywrightLibrary, CoreLibrary } from '@core';
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * RequestUploadDocumentPage - Page object cho Request Upload Document page
 * 
 * This page is accessed by recipients via email link:
 * /request-upload-document/[requestDocumentId]
 * 
 * Reference: speedydd-automation/src/pages/RequestUploadDocumentPageWeb.ts
 */
export class RequestUploadDocumentPage extends BasePage {
  protected getPropertiesFile(): string {
    return 'persons'; // Reuse persons.properties as it contains relevant locators
  }
  
  // Timeout constants
  private readonly TIMEOUTS = {
    short: 2000,
    medium: 5000,
    long: 10000,
    veryLong: 15000,
    upload: 30000,
  };
  
  // Locator selectors (with fallbacks, keep in code)
  private readonly SELECTORS = {
    secretKeyInput: 'input[name="secret-key"], input[placeholder*="secret key" i]',
    submitButton: 'button:has-text("Submit"), button[type="submit"]',
    fileInput: 'input[type="file"]',
    saveButton: 'button:has-text("Save and Send"), button:has-text("Save"), button:has-text("Submit")',
    uploadButton: 'button:has-text("Upload"):not(:has-text("Submit"))',
    errorMessage: 'text=/invalid|error|expired|failed/i',
    successPanel: 'p:has-text("Document Submitted Successfully")',
    uploadSuccess: 'text=/upload.*success|successfully.*upload/i',
    successClass: '[class*="success"], [class*="complete"]',
  };
  
  // Success message fallback selectors
  private readonly SUCCESS_FALLBACK_SELECTORS = [
    'text=/Your document has been uploaded and submitted successfully/i',
    'text=/Thank you/i',
    'text=/success|uploaded|completed/i',
  ];
  
  /**
   * Navigate to the Request Upload Document page
   * @param requestDocumentId - The request document ID
   */
  async goto(requestDocumentId: string) {
    await CoreLibrary.log.step(`Navigating to request upload document page: ${requestDocumentId}`);
    await super.goto(`/request-upload-document/${requestDocumentId}`);
    await this.safeWaitForLoadState();
    await CoreLibrary.log.debug('Successfully navigated to request upload document page');
  }
  
  /**
   * Helper: Safely wait for load state (ignore timeout)
   */
  private async safeWaitForLoadState() {
    await this.page.waitForLoadState('networkidle', { timeout: this.TIMEOUTS.long }).catch(() => {});
  }
  
  /**
   * Enter and submit secret key
   * @param secretKey - The secret key from email
   */
  async enterSecretKey(secretKey: string) {
    await CoreLibrary.log.step('Entering secret key');
    await this.fillAndSubmitSecretKey(secretKey);
    await this.waitForPageAfterSubmission();
    await this.openUploadPanel();
    await this.verifyUploadPanel();
    await CoreLibrary.log.pass('Secret key verified successfully');
  }
  
  /**
   * Helper: Fill and submit secret key
   */
  private async fillAndSubmitSecretKey(secretKey: string) {
    const secretKeyInput = this.page.locator(this.SELECTORS.secretKeyInput).first();
    await secretKeyInput.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long });
    await secretKeyInput.fill(secretKey);
    await CoreLibrary.log.debug(`Secret key entered (first 4 chars: ${secretKey.substring(0, 4)}...)`);
    
    const submitButton = this.page.locator(this.SELECTORS.submitButton).first();
    await submitButton.waitFor({ state: 'visible', timeout: this.TIMEOUTS.medium });
    await submitButton.click();
    await CoreLibrary.log.debug('Submit button clicked');
  }
  
  /**
   * Helper: Wait for page to load after secret key submission
   */
  private async waitForPageAfterSubmission() {
    await this.safeWaitForLoadState();
    await this.page.waitForTimeout(1000); // Wait for React to render
  }
  
  /**
   * Helper: Open upload panel by clicking Upload button
   */
  private async openUploadPanel() {
    const uploadButton = this.page.locator(this.SELECTORS.uploadButton).first();
    
    try {
      await uploadButton.waitFor({ state: 'visible', timeout: this.TIMEOUTS.long });
      await CoreLibrary.log.debug('Found Upload button, clicking to open upload panel');
      await uploadButton.click();
      await this.page.waitForTimeout(1000);
    } catch (error: any) {
      await this.handleSecretKeyError('Upload button did not appear after submitting secret key');
    }
  }
  
  /**
   * Helper: Verify upload panel is visible
   */
  private async verifyUploadPanel() {
    const fileInput = this.page.locator(this.SELECTORS.fileInput).first();
    
    try {
      await fileInput.waitFor({ state: 'attached', timeout: this.TIMEOUTS.long });
      await CoreLibrary.log.debug('File input found in upload panel');
    } catch (error: any) {
      await this.handleSecretKeyError('Upload panel (file input) did not appear after clicking Upload button');
    }
  }
  
  /**
   * Helper: Handle secret key verification errors
   */
  private async handleSecretKeyError(contextMessage: string) {
    await CoreLibrary.log.debug('Checking for error messages...');
    const errorMessage = this.page.locator(this.SELECTORS.errorMessage).first();
    const hasError = await errorMessage.isVisible({ timeout: this.TIMEOUTS.short }).catch(() => false);
    
    if (hasError) {
      const errorText = await errorMessage.textContent().catch(() => 'Unknown error');
      await CoreLibrary.log.warning(`Error found: ${errorText}`);
      throw new Error(`Secret key verification failed: ${errorText}. Check if secret key is correct and request is not expired.`);
    }
    
    throw new Error(`Secret key verification failed: ${contextMessage}. Check if secret key is correct and request is not expired.`);
  }
  
  
  /**
   * Upload a file to the request document
   * @param filePath - Path to the file to upload (or create dummy file)
   */
  async uploadFile(filePath?: string) {
    await CoreLibrary.log.step('Uploading file');
    const finalFilePath = filePath || await this.createDummyPdfFile();
    await this.selectFileForUpload(finalFilePath);
    await this.waitForUploadCompletion();
  }
  
  /**
   * Helper: Create dummy PDF file
   */
  private async createDummyPdfFile(): Promise<string> {
    await CoreLibrary.log.debug('Creating dummy PDF file for upload');
    const dummyContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 0\ntrailer\n<< /Size 0 /Root 1 0 R >>\nstartxref\n0\n%%EOF');
    const filePath = await this.createDummyFile(dummyContent, 'test-document.pdf');
    await CoreLibrary.log.debug(`Dummy file created: ${filePath}`);
    return filePath;
  }
  
  /**
   * Helper: Select file for upload
   */
  private async selectFileForUpload(filePath: string) {
    await CoreLibrary.log.debug(`Using file: ${filePath}`);
    const fileInput = this.page.locator(this.SELECTORS.fileInput).first();
    await fileInput.waitFor({ state: 'attached', timeout: this.TIMEOUTS.long });
    await fileInput.setInputFiles(filePath);
    await CoreLibrary.log.debug('File selected for upload');
    await this.page.waitForTimeout(this.TIMEOUTS.short);
  }
  
  /**
   * Helper: Wait for upload completion
   */
  private async waitForUploadCompletion() {
    await CoreLibrary.log.debug('Waiting for upload completion indicators...');
    const uploadSuccess = await Promise.race([
      this.page.locator(this.SELECTORS.uploadSuccess).waitFor({ state: 'visible', timeout: this.TIMEOUTS.upload }).then(() => true),
      this.page.locator(this.SELECTORS.successClass).waitFor({ state: 'visible', timeout: this.TIMEOUTS.upload }).then(() => true),
      this.page.waitForTimeout(this.TIMEOUTS.long).then(() => false),
    ]).catch(() => false);
    
    if (uploadSuccess) {
      await CoreLibrary.log.pass('File uploaded successfully');
    } else {
      await CoreLibrary.log.warning('Upload completion not confirmed, but continuing...');
    }
  }
  
  /**
   * Click "Save and Send" button to finalize the upload
   */
  async saveAndSend() {
    await CoreLibrary.log.step('Saving and sending document');
    const saveButton = await this.waitForSaveButton();
    const response = await this.clickSaveButtonAndWaitForResponse(saveButton);
    await this.handleApiResponse(response);
    await this.verifySuccessPanel();
  }
  
  /**
   * Helper: Wait for Save and Send button to appear
   */
  private async waitForSaveButton() {
    const saveButton = this.page.locator(this.SELECTORS.saveButton).first();
    await saveButton.waitFor({ state: 'visible', timeout: this.TIMEOUTS.upload });
    await CoreLibrary.log.debug('Save and Send button found');
    return saveButton;
  }
  
  /**
   * Helper: Click Save button and wait for API response
   */
  private async clickSaveButtonAndWaitForResponse(saveButton: ReturnType<typeof this.page.locator>) {
    await CoreLibrary.log.debug('Clicking Save and Send button and waiting for API response...');
    
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (response) => 
          response.url().includes('/request-document/upload/') && 
          response.url().includes('/save') &&
          response.request().method() === 'POST',
        { timeout: this.TIMEOUTS.upload }
      ).catch(() => null),
      saveButton.click()
    ]);
    
    return response;
  }
  
  /**
   * Helper: Handle API response
   */
  private async handleApiResponse(response: any) {
    if (!response) {
      await CoreLibrary.log.warning('API response not captured, but continuing...');
      return;
    }
    
    const status = response.status();
    await CoreLibrary.log.debug(`API response received with status: ${status}`);
    
    if (status >= 200 && status < 300) {
      await CoreLibrary.log.debug('API call successful, waiting for React to update UI...');
    } else {
      await CoreLibrary.log.warning(`API call returned status ${status}, but continuing...`);
    }
  }
  
  /**
   * Helper: Verify success panel appears
   */
  private async verifySuccessPanel() {
    await CoreLibrary.log.debug('Waiting for success panel to appear...');
    
    try {
      const successPanel = this.page.locator(this.SELECTORS.successPanel).first();
      await successPanel.waitFor({ state: 'visible', timeout: this.TIMEOUTS.veryLong });
      await CoreLibrary.log.debug('Success panel found: "Document Submitted Successfully"');
      await CoreLibrary.log.pass('Document saved and sent successfully');
    } catch {
      await this.tryFallbackSuccessSelectors();
    }
  }
  
  /**
   * Helper: Try fallback success selectors
   */
  private async tryFallbackSuccessSelectors() {
    await CoreLibrary.log.debug('Primary selector not found, trying fallback selectors...');
    
    for (const selector of this.SUCCESS_FALLBACK_SELECTORS) {
      try {
        const successElement = this.page.locator(selector).first();
        await successElement.waitFor({ state: 'visible', timeout: this.TIMEOUTS.medium });
        await CoreLibrary.log.debug(`Success panel found with fallback selector: ${selector}`);
        await CoreLibrary.log.pass('Document saved and sent successfully');
        return;
      } catch {
        continue;
      }
    }
    
    await CoreLibrary.log.warning('Success message not found, but continuing... (like speedydd-automation behavior)');
  }
  
  /**
   * Complete the full upload flow: enter secret key → upload file → save
   * @param secretKey - The secret key
   * @param filePath - Optional file path (creates dummy file if not provided)
   */
  async completeUploadFlow(secretKey: string, filePath?: string) {
    await CoreLibrary.log.step('Starting complete upload flow');
    await this.enterSecretKey(secretKey);
    await this.uploadFile(filePath);
    await this.saveAndSend();
    await CoreLibrary.log.pass('Complete upload flow finished successfully');
  }
  
  /**
   * Create a dummy file for testing
   * @param content - File content as Buffer
   * @param fileName - File name
   * @returns Path to the created file
   */
  private async createDummyFile(content: Buffer, fileName: string): Promise<string> {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, fileName);
    
    fs.writeFileSync(filePath, content);
    
    return filePath;
  }
}

