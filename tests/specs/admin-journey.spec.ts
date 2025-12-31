import { test, expect } from '@playwright/test';
import { PlaywrightInstance, CoreLibrary } from '@core';
import { testStep, captureFailureArtifacts } from '@playwrightUtils';
import { LoginPage } from '../pages/LoginPage';
import { PersonsPage } from '../pages/PersonsPage';
import { AssignPage } from '../pages/AssignPage';
import { PersonDetailsPage } from '../pages/PersonDetailsPage';
import { RequestUploadDocumentPage } from '../pages/RequestUploadDocumentPage';

// Auto-dismiss dialogs (alerts, confirms, prompts, geolocation popups)
test.beforeEach(async ({ page, context }) => {
  // Auto-dismiss all dialogs
  page.on('dialog', async dialog => {
    await dialog.dismiss();
  });
  
  // Clear all permissions (including geolocation) to prevent popups
  await context.clearPermissions();
});

// Capture artifacts when test fails - runs BEFORE page cleanup
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
    await captureFailureArtifacts(page, 'admin-journey-failure');
  }
});

test('Admin completes critical journey @UI', async ({ page }) => {
  // Set test timeout to 2 minutes (this test takes longer due to document upload flow)
  test.setTimeout(120000);
  
  // ============================================
  // SETUP: Initialize all page objects needed for this test
  // ============================================
  const qe = PlaywrightInstance.get(page);
  const loginPage = new LoginPage(qe, page);
  const personsPage = new PersonsPage(qe, page);
  const assignPage = new AssignPage(qe, page);
  const personDetailsPage = new PersonDetailsPage(qe, page);
  const requestUploadDocumentPage = new RequestUploadDocumentPage(qe, page);
  
  // Test data: Person information to create
  const personData = {
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Test'
  };
  
  // ============================================
  // STEP 1: Admin logs into the system
  // ============================================
  await testStep('Admin logs in successfully', async () => {
    await loginPage.loginAsAutoAccount();
    await qe.screen.screenshot('01-after-login');
  });
  
  // ============================================
  // STEP 2: Admin views all assigned items in Assign tab
  // ============================================
  await testStep('Admin views all assigned items in Assign tab', async () => {
    await assignPage.openAndVerifyOverview();
    await qe.screen.screenshot('02-assign-overview');
  });
  
  // ============================================
  // STEP 3: Admin creates a new person
  // Expected: Person is created with [AUTO] prefix in name
  // ============================================
  let createResult: { personId: string; actualFirstName: string };
  
  await testStep('Admin creates a new Person successfully', async () => {
    createResult = await personsPage.createPersonSuccessfully(personData);
    
    // Verify person was created correctly
    // - Person ID should exist
    // - First name should contain [AUTO] prefix
    // - First name should contain the original name "John"
    expect(createResult.personId).toBeTruthy();
    expect(createResult.actualFirstName).toContain('[AUTO]');
    expect(createResult.actualFirstName).toContain('John');
    
    await qe.screen.screenshot('03-after-person-creation');
  });
  
  // ============================================
  // STEP 4: Admin verifies person details on Person Details page
  // Expected: Form shows the correct person information
  // ============================================
  await testStep('Admin verifies person details on Person Details page', async () => {
    await personDetailsPage.verifyPersonDetails({
      firstName: createResult.actualFirstName, // Use actual name with [AUTO] prefix
      lastName: personData.lastName,
      middleName: personData.middleName
    });
    await qe.screen.screenshot('04-after-person-details-verification');
  });
  
  // ============================================
  // STEP 5: Admin requests document upload and receives uploaded file
  // Flow:
  //   1. Admin requests document upload for CV folder
  //   2. System sends email with secret key
  //   3. Recipient (simulated) uploads document using secret key
  //   4. Admin verifies document appears in CV folder
  // ============================================
  await testStep('Admin requests document upload and receives uploaded file successfully', async () => {
    // Navigate to person details page
    await personDetailsPage.goto(createResult.personId);
    
    // Request document upload for CV folder
    // This will:
    // - Open CV folder action menu
    // - Click "Request Upload"
    // - Fill form with email, expiration days, and message
    // - Submit and capture requestDocumentId and secretKey from API response
    const requestDocumentData = await personDetailsPage.requestDocumentUpload('CV', {
      email: 'test@example.com',
      linkExpirationDays: 7,
      message: 'Please upload your CV document'
    });
    
    // Verify we got the request document data (requestDocumentId and secretKey)
    if (!requestDocumentData) {
      throw new Error('Failed to capture request document data from API response');
    }
    
    // Simulate recipient: navigate to upload page and complete upload
    // This simulates what happens when recipient clicks the email link
    await requestUploadDocumentPage.goto(requestDocumentData.requestDocumentId);
    await requestUploadDocumentPage.completeUploadFlow(requestDocumentData.secretKey);
    
    // Wait for document to be processed and appear in CV folder
    await testStep('Waiting for document to appear in CV folder', async () => {
      // Wait a bit for document to be processed by the system
      if (!page.isClosed()) {
        await page.waitForTimeout(2000);
      }
      
      // Navigate back to person details page and verify document appears in CV folder
      await personDetailsPage.goto(createResult.personId);
      await personDetailsPage.verifyDocumentInFolder('CV', 'test-document.pdf');
    });
    
    await qe.screen.screenshot('05-after-document-upload-verification');
  });
  
  // ============================================
  // STEP 6: Admin searches for person by name and deletes it
  // Expected: Person is deleted from the system
  // ============================================
  await testStep('Admin searches for person by name and deletes it', async () => {
    // Build full name using actual firstName (with [AUTO] prefix) that appears in grid
    const fullName = `${createResult.actualFirstName} ${personData.middleName} ${personData.lastName}`.trim();
    
    // Search and delete the person
    await personsPage.deletePersonByName(fullName);
    
    await qe.screen.screenshot('06-after-person-deletion');
  });
  
  // TODO: Implement logout step
});




