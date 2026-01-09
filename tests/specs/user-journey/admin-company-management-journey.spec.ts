// Skeleton spec for company/organisation management E2E journeys
// Examples: create company, manage permissions, navigation

import { test } from '@playwright/test';
import {createAdminJourneyFlow, DocumentUploadConfig, PersonData} from '../../flows/AdminJourneyFlow';
import {PlaywrightInstance} from "@core";
import {SessionConfig, SessionManager} from "@support/contextSupport";
const TEST_PERSON_DATA: PersonData = {
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Test',
};

const TEST_DOCUMENT_CONFIG: DocumentUploadConfig = {
    folderName: 'CV',
    email: 'test@example.com',
    linkExpirationDays: 7,
    message: 'Please upload your CV document',
    expectedFileName: 'test-document.pdf',
};


test.describe('Admin Company/Organisation Management Journey - E2E @UI', () => {
  test('Admin manages organisations end-to-end', async ({ page }) => {
      const qe = PlaywrightInstance.get(page);
      await qe.data.setTestData('admin-session');
      const sessionConfig: SessionConfig = await SessionManager.getSessionConfig(
          qe,
          'admin',
      );

      const flow = createAdminJourneyFlow(page, sessionConfig);
      await flow.standardLogin();
      await flow.mainMenuWalkthrough();
      await flow.globalSearch();
      await flow.createNewOrg();
      await flow.addcompany();
      await flow.createPersonAndVerify(TEST_PERSON_DATA);
      await flow.requestDocumentUploadAndVerify(TEST_DOCUMENT_CONFIG);
      await flow.deletePerson(TEST_PERSON_DATA);
  });
});

