import { test, expect } from '@playwright/test';
import { PlaywrightInstance, CoreLibrary } from '@core';
import { testStep, captureFailureArtifacts } from '@playwrightUtils';
import { LoginPage } from '../pages/LoginPage';
import { PersonsPage } from '../pages/PersonsPage';
import { AssignPage } from '../pages/AssignPage';
import { PersonDetailsPage } from '../pages/PersonDetailsPage';
import { RequestUploadDocumentPage } from '../pages/RequestUploadDocumentPage';

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
  test.setTimeout(120000);
  
  const qe = PlaywrightInstance.get(page);
  const loginPage = new LoginPage(qe, page);
  const personsPage = new PersonsPage(qe, page);
  const assignPage = new AssignPage(qe, page);
  const personDetailsPage = new PersonDetailsPage(qe, page);
  const requestUploadDocumentPage = new RequestUploadDocumentPage(qe, page);
  
  const personData = {
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Test'
  };
  await testStep('Admin logs in successfully', async () => {
    await loginPage.loginAsAutoAccount();
    await qe.screen.screenshot('01-after-login');
  });
  
  await testStep('Admin views all assigned items in Assign tab', async () => {
    await assignPage.openAndVerifyOverview();
    await qe.screen.screenshot('02-assign-overview');
  });
  
  let createResult: { personId: string; actualFirstName: string };
  
  await testStep('Admin creates a new Person successfully', async () => {
    createResult = await personsPage.createPersonSuccessfully(personData);
    expect(createResult.personId).toBeTruthy();
    expect(createResult.actualFirstName).toContain('[AUTO]');
    expect(createResult.actualFirstName).toContain('John');
    await qe.screen.screenshot('03-after-person-creation');
  });
  
  await testStep('Admin verifies person details on Person Details page', async () => {
    await personDetailsPage.verifyPersonDetails({
      firstName: createResult.actualFirstName,
      lastName: personData.lastName,
      middleName: personData.middleName
    });
    await qe.screen.screenshot('04-after-person-details-verification');
  });
  
  await testStep('Admin requests document upload and receives uploaded file successfully', async () => {
    await personDetailsPage.goto(createResult.personId);
    
    const requestDocumentData = await personDetailsPage.requestDocumentUpload('CV', {
      email: 'test@example.com',
      linkExpirationDays: 7,
      message: 'Please upload your CV document'
    });
    
    if (!requestDocumentData) {
      throw new Error('Failed to capture request document data from API response');
    }
    
    await requestUploadDocumentPage.goto(requestDocumentData.requestDocumentId);
    await requestUploadDocumentPage.completeUploadFlow(requestDocumentData.secretKey);
    
    await testStep('Waiting for document to appear in CV folder', async () => {
      if (!page.isClosed()) {
        await page.waitForTimeout(2000);
      }
      await personDetailsPage.goto(createResult.personId);
      await personDetailsPage.verifyDocumentInFolder('CV', 'test-document.pdf');
    });
    
    await qe.screen.screenshot('05-after-document-upload-verification');
  });
  
  await testStep('Admin searches for person by name and deletes it', async () => {
    const fullName = `${createResult.actualFirstName} ${personData.middleName} ${personData.lastName}`.trim();
    await personsPage.deletePersonByName(fullName);
    await qe.screen.screenshot('06-after-person-deletion');
  });
});




