import { Page } from '@playwright/test';
import { PlaywrightInstance } from '@core';
import { testStep } from '@playwrightUtils';
import { BaseFlow } from './BaseFlow';
import { SessionConfig, TwoFAOptions } from '@support/contextSupport';
import { PersonsPage } from '../pages/PersonsPage';
import { AssignPage } from '../pages/AssignPage';
import { PersonDetailsPage } from '../pages/PersonDetailsPage';
import { RequestUploadDocumentPage } from '../pages/RequestUploadDocumentPage';
import {LoginPage} from "@tests/pages/LoginPage";
import {TwoFAPage} from "@tests/pages/TwoFAPage";

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

export class AdminJourneyFlow extends BaseFlow {
  private state: AdminJourneyState = {};

  private personsPage: PersonsPage;
  private assignPage: AssignPage;
  private personDetailsPage: PersonDetailsPage;
  private requestUploadDocumentPage: RequestUploadDocumentPage;

  constructor(page: Page, sessionConfig?: SessionConfig) {
    super(page, sessionConfig);
    this.personsPage = new PersonsPage(this.qe, page);
    this.assignPage = new AssignPage(this.qe, page);
    this.personDetailsPage = new PersonDetailsPage(this.qe, page);
    this.requestUploadDocumentPage = new RequestUploadDocumentPage(this.qe, page);
  }

  protected onPageUpdated(): void {
    this.personsPage = new PersonsPage(this.qe, this.page);
    this.assignPage = new AssignPage(this.qe, this.page);
    this.personDetailsPage = new PersonDetailsPage(this.qe, this.page);
    this.requestUploadDocumentPage = new RequestUploadDocumentPage(this.qe, this.page);
  }

  async login(sessionConfig?: SessionConfig, twoFAOptions?: TwoFAOptions) {
    if (sessionConfig) {
      this.sessionConfig = sessionConfig;
    }
    await super.performLogin(this.sessionConfig, twoFAOptions);
    return this;
  }

  async gotoPersonDetailsById(personId: string) {
    const baseUrl =
      this.qe.envProps.get('baseUrl') || 'http://127.0.0.1:3000';
    await this.page.goto(`${baseUrl}/lobby/edit-person/${personId}`);
    return this;
  }

  async loginAsAdmin() {
    return this.login();
  }

  async viewAssignOverview() {
    await testStep('Admin views all assigned items in Assign tab', async () => {
      await this.assignPage.openAndVerifyOverview();
      await this.qe.screen.screenshot('02-assign-overview');
    });
    return this;
  }

  async createPerson(data: PersonData) {
    await testStep('Admin creates a new Person successfully', async () => {
      const result = await this.personsPage.createPersonSuccessfully(data);

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

  async requestDocumentUploadAndVerify(config: DocumentUploadConfig) {
    if (!this.state.personResult) {
      throw new Error('Cannot request document upload: person not created yet. Call createPerson() first.');
    }

    await testStep('Admin requests document upload and receives uploaded file successfully', async () => {
      await this.personDetailsPage.goto(this.state.personResult!.personId);

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

      await this.requestUploadDocumentPage.goto(requestDocumentData.requestDocumentId);
      await this.requestUploadDocumentPage.completeUploadFlow(requestDocumentData.secretKey);

      await testStep('Waiting for document to appear in CV folder', async () => {
        if (!this.page.isClosed()) {
          await this.page.waitForTimeout(2000);
        }
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

  async adminLoginFlow(data: { email: string, password: string }): Promise<this> {
    await testStep('Standard Login', async () => {
      const { secret } = await this.enterEmailAndPassword(data.email, data.password);
      await this.enter2FA(undefined, secret);
      await this.landOnDashboard();
    });
    return this;
  }

  async adminPasswordResetFlow() {
    await testStep('Password Reset', async () => {

    });
    return this;
  }

  async adminLogoutFlow() {
    await testStep('Logout', async () => {

    });
    return this;
  }


  async createPersonAndVerify(data: PersonData) {
    await this.createPerson(data);
    await this.verifyPersonDetails(data);
    return this;
  }

  async fullJourney(personData: PersonData, documentConfig: DocumentUploadConfig) {
    await this.loginAsAdmin();
    await this.viewAssignOverview();
    await this.createPersonAndVerify(personData);
    await this.requestDocumentUploadAndVerify(documentConfig);
    await this.deletePerson(personData);
    return this;
  }

  getState(): AdminJourneyState {
    return { ...this.state };
  }

  getPersonResult(): CreatePersonResult {
    if (!this.state.personResult) {
      throw new Error('Person result not available. Call createPerson() first.');
    }
    return this.state.personResult;
  }

  getRequestDocumentData(): RequestDocumentData {
    if (!this.state.requestDocumentData) {
      throw new Error('Request document data not available. Call requestDocumentUploadAndVerify() first.');
    }
    return this.state.requestDocumentData;
  }
}

export function createAdminJourneyFlow(
  page: Page,
  sessionConfig?: SessionConfig
): AdminJourneyFlow {
  return new AdminJourneyFlow(page, sessionConfig);
}

