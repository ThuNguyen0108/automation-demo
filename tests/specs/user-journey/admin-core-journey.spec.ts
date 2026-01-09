import { test } from '@playwright/test';
import { PlaywrightInstance } from '@core';
import { SessionManager, SessionConfig } from '@support/contextSupport';
import {
  createAdminJourneyFlow,
  PersonData,
  DocumentUploadConfig,
} from '../../flows/AdminJourneyFlow';

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

test.describe('Session Management - Admin Journey with Session', () => {
  test('Admin completes critical journey with session + refresh token @UI', async ({
    page,
  }) => {
    const qe = PlaywrightInstance.get(page);
    await qe.data.setTestData('admin-session');
    const sessionConfig: SessionConfig = await SessionManager.getSessionConfig(
      qe,
      'admin',
    );

    const flow = createAdminJourneyFlow(page, sessionConfig);
    await flow.login(sessionConfig);
    await flow.viewAssignOverview();
    await flow.createPersonAndVerify(TEST_PERSON_DATA);
    await flow.requestDocumentUploadAndVerify(TEST_DOCUMENT_CONFIG);
    await flow.deletePerson(TEST_PERSON_DATA);
  });
});


