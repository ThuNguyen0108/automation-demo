/**
 * AdminJourneyFlow - Fluent Interface Pattern for Admin Journey Tests
 * 
 * This flow provides a fluent API for composing admin journey test steps.
 * Each method returns `this` to enable method chaining.
 * 
 * Features:
 * - ✅ Integrates with testStep for Allure and Playwright reporting
 * - ✅ Automatic state management
 * - ✅ Easy to compose flows
 * - ✅ Type-safe
 */

import { Page } from '@playwright/test';
import { PlaywrightInstance } from '@core';
import { testStep } from '@playwrightUtils';
import { LoginPage } from '../pages/LoginPage';
import { PersonsPage } from '../pages/PersonsPage';
import { AssignPage } from '../pages/AssignPage';
import { PersonDetailsPage } from '../pages/PersonDetailsPage';
import { RequestUploadDocumentPage } from '../pages/RequestUploadDocumentPage';

// ============================================
// Types
// ============================================

export interface PersonData {
  firstName: string;
  lastName: string;
  middleName: string;
}

export interface CreatePersonResult {
  personId: string;
  actualFirstName: string;
}

export interface RequestDocumentData {
  requestDocumentId: string;
  secretKey: string;
}

export interface DocumentUploadConfig {
  folderName: string;
  email: string;
  linkExpirationDays: number;
  message: string;
  expectedFileName: string;
}

interface AdminJourneyState {
  personResult?: CreatePersonResult;
  requestDocumentData?: RequestDocumentData;
}

// ============================================
// AdminJourneyFlow Class
// ============================================

export class AdminJourneyFlow {
  private state: AdminJourneyState = {};
  private qe: any;
  
  // Page objects
  private loginPage: LoginPage;
  private personsPage: PersonsPage;
  private assignPage: AssignPage;
  private personDetailsPage: PersonDetailsPage;
  private requestUploadDocumentPage: RequestUploadDocumentPage;
  
  constructor(private page: Page) {
    this.qe = PlaywrightInstance.get(page);
    
    // Initialize page objects
    this.loginPage = new LoginPage(this.qe, page);
    this.personsPage = new PersonsPage(this.qe, page);
    this.assignPage = new AssignPage(this.qe, page);
    this.personDetailsPage = new PersonDetailsPage(this.qe, page);
    this.requestUploadDocumentPage = new RequestUploadDocumentPage(this.qe, page);
  }
  
  // ============================================
  // Login & Navigation
  // ============================================
  
  /**
   * Admin logs into the system
   * 
   * ✅ Integrates with testStep for reporting
   */
  async loginAsAdmin() {
    await testStep('Admin logs in successfully', async () => {
      await this.loginPage.loginAsAutoAccount();
      await this.qe.screen.screenshot('01-after-login');
    });
    return this;
  }
  
  /**
   * Admin views all assigned items in Assign tab
   */
  async viewAssignOverview() {
    await testStep('Admin views all assigned items in Assign tab', async () => {
      await this.assignPage.openAndVerifyOverview();
      await this.qe.screen.screenshot('02-assign-overview');
    });
    return this;
  }
  
  // ============================================
  // Person Management
  // ============================================
  
  /**
   * Admin creates a new person
   * Expected: Person is created with [AUTO] prefix in name
   */
  async createPerson(data: PersonData) {
    await testStep('Admin creates a new Person successfully', async () => {
      const result = await this.personsPage.createPersonSuccessfully(data);
      
      // Verify person was created correctly
      // - Person ID should exist
      // - First name should contain [AUTO] prefix
      // - First name should contain the original name
      if (!result.personId) {
        throw new Error('Person creation failed: personId is missing');
      }
      if (!result.actualFirstName.includes('[AUTO]')) {
        throw new Error('Person creation failed: [AUTO] prefix not found');
      }
      if (!result.actualFirstName.includes(data.firstName)) {
        throw new Error(`Person creation failed: firstName "${data.firstName}" not found`);
      }
      
      this.state.personResult = result;
      await this.qe.screen.screenshot('03-after-person-creation');
    });
    return this;
  }
  
  /**
   * Admin verifies person details on Person Details page
   * Expected: Form shows the correct person information
   */
  async verifyPersonDetails(data: PersonData) {
    if (!this.state.personResult) {
      throw new Error('Cannot verify person details: person not created yet. Call createPerson() first.');
    }
    
    await testStep('Admin verifies person details on Person Details page', async () => {
      await this.personDetailsPage.verifyPersonDetails({
        firstName: this.state.personResult!.actualFirstName,
        lastName: data.lastName,
        middleName: data.middleName
      });
      await this.qe.screen.screenshot('04-after-person-details-verification');
    });
    return this;
  }
  
  /**
   * Admin searches for person by name and deletes it
   * Expected: Person is deleted from the system
   */
  async deletePerson(data: PersonData) {
    if (!this.state.personResult) {
      throw new Error('Cannot delete person: person not created yet. Call createPerson() first.');
    }
    
    await testStep('Admin searches for person by name and deletes it', async () => {
      const fullName = `${this.state.personResult!.actualFirstName} ${data.middleName} ${data.lastName}`.trim();
      await this.personsPage.deletePersonByName(fullName);
      await this.qe.screen.screenshot('06-after-person-deletion');
    });
    return this;
  }
  
  // ============================================
  // Document Upload
  // ============================================
  
  /**
   * Admin requests document upload and receives uploaded file
   * Flow:
   *   1. Admin requests document upload for folder
   *   2. System sends email with secret key
   *   3. Recipient (simulated) uploads document using secret key
   *   4. Admin verifies document appears in folder
   */
  async requestDocumentUploadAndVerify(config: DocumentUploadConfig) {
    if (!this.state.personResult) {
      throw new Error('Cannot request document upload: person not created yet. Call createPerson() first.');
    }
    
    await testStep('Admin requests document upload and receives uploaded file successfully', async () => {
      // Navigate to person details page
      await this.personDetailsPage.goto(this.state.personResult!.personId);
      
      // Request document upload
      const requestDocumentData = await this.personDetailsPage.requestDocumentUpload(
        config.folderName,
        {
          email: config.email,
          linkExpirationDays: config.linkExpirationDays,
          message: config.message
        }
      );
      
      if (!requestDocumentData) {
        throw new Error('Failed to capture request document data from API response');
      }
      
      this.state.requestDocumentData = requestDocumentData;
      
      // Simulate recipient: navigate to upload page and complete upload
      await this.requestUploadDocumentPage.goto(requestDocumentData.requestDocumentId);
      await this.requestUploadDocumentPage.completeUploadFlow(requestDocumentData.secretKey);
      
      // Wait for document to be processed and appear in folder
      await testStep('Waiting for document to appear in CV folder', async () => {
        if (!this.page.isClosed()) {
          await this.page.waitForTimeout(2000);
        }
        
        // Navigate back to person details page and verify document appears
        await this.personDetailsPage.goto(this.state.personResult!.personId);
        await this.personDetailsPage.verifyDocumentInFolder(
          config.folderName,
          config.expectedFileName
        );
      });
      
      await this.qe.screen.screenshot('05-after-document-upload-verification');
    });
    return this;
  }
  
  // ============================================
  // Composed Flows (Sub-flows)
  // ============================================
  
  /**
   * Compose: Create person and verify details
   * This is a sub-flow that combines createPerson + verifyPersonDetails
   */
  async createPersonAndVerify(data: PersonData) {
    await this.createPerson(data);
    await this.verifyPersonDetails(data);
    return this;
  }
  
  /**
   * Compose: Full admin journey
   * This is a complete flow from login to cleanup
   */
  async fullJourney(personData: PersonData, documentConfig: DocumentUploadConfig) {
    await this.loginAsAdmin();
    await this.viewAssignOverview();
    await this.createPersonAndVerify(personData);
    await this.requestDocumentUploadAndVerify(documentConfig);
    await this.deletePerson(personData);
    return this;
  }
  
  // ============================================
  // State Access
  // ============================================
  
  /**
   * Get current state (for assertions or further actions)
   */
  getState(): AdminJourneyState {
    return { ...this.state };
  }
  
  /**
   * Get person result
   */
  getPersonResult(): CreatePersonResult {
    if (!this.state.personResult) {
      throw new Error('Person result not available. Call createPerson() first.');
    }
    return this.state.personResult;
  }
  
  /**
   * Get request document data
   */
  getRequestDocumentData(): RequestDocumentData {
    if (!this.state.requestDocumentData) {
      throw new Error('Request document data not available. Call requestDocumentUploadAndVerify() first.');
    }
    return this.state.requestDocumentData;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create AdminJourneyFlow instance
 * 
 * @param page Playwright Page object
 * @returns AdminJourneyFlow instance
 */
export function createAdminJourneyFlow(page: Page): AdminJourneyFlow {
  return new AdminJourneyFlow(page);
}

