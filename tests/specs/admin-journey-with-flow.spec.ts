import { test } from '@playwright/test';
import { captureFailureArtifacts } from '@playwrightUtils';
import { createAdminJourneyFlow, PersonData, DocumentUploadConfig } from '../flows/AdminJourneyFlow';

const TEST_PERSON_DATA: PersonData = {
  firstName: 'John',
  lastName: 'Doe',
  middleName: 'Test'
};

const TEST_DOCUMENT_CONFIG: DocumentUploadConfig = {
  folderName: 'CV',
  email: 'test@example.com',
  linkExpirationDays: 7,
  message: 'Please upload your CV document',
  expectedFileName: 'test-document.pdf'
};

test.beforeEach(async ({ page, context }) => {
  page.on('dialog', async dialog => {
    await dialog.dismiss();
  });
  await context.clearPermissions();
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
    await captureFailureArtifacts(page, 'admin-journey-failure');
  }
});

test('Admin completes critical journey @UI', async ({ page }) => {
  const flow = createAdminJourneyFlow(page);
  await flow.loginAsAdmin();
  await flow.viewAssignOverview();
  await flow.createPersonAndVerify(TEST_PERSON_DATA);
  await flow.requestDocumentUploadAndVerify(TEST_DOCUMENT_CONFIG);
  await flow.deletePerson(TEST_PERSON_DATA);
});

test('Admin completes critical journey - using fullJourney @UI', async ({ page }) => {
  const flow = createAdminJourneyFlow(page);
  await flow.fullJourney(TEST_PERSON_DATA, TEST_DOCUMENT_CONFIG);
});

test('Admin creates and verifies person only @UI', async ({ page }) => {
  const flow = createAdminJourneyFlow(page);
  await flow.loginAsAdmin();
  await flow.viewAssignOverview();
  await flow.createPersonAndVerify(TEST_PERSON_DATA);
  await flow.deletePerson(TEST_PERSON_DATA);
  
  const personResult = flow.getPersonResult();
  console.log(`Created person with ID: ${personResult.personId}`);
});
