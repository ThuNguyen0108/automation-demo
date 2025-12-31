/**
 * Admin Journey Test - Using Fluent Interface Flow
 * 
 * This is a proof of concept showing how to use AdminJourneyFlow
 * for better readability and flow composition.
 * 
 * Compare with admin-journey.spec.ts to see the difference.
 */

import { test } from '@playwright/test';
import { captureFailureArtifacts } from '@playwrightUtils';
import { createAdminJourneyFlow, PersonData, DocumentUploadConfig } from '../flows/AdminJourneyFlow';

// ============================================
// TEST DATA - Centralized test data
// ============================================

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

// ============================================
// TEST HOOKS
// ============================================

// Auto-dismiss dialogs (alerts, confirms, prompts, geolocation popups)
test.beforeEach(async ({ page, context }) => {
  page.on('dialog', async dialog => {
    await dialog.dismiss();
  });
  await context.clearPermissions();
});

// Capture artifacts when test fails
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
    await captureFailureArtifacts(page, 'admin-journey-failure');
  }
});

// ============================================
// TEST CASES
// ============================================

test('Admin completes critical journey @UI', async ({ page }) => {
  
  // Setup: Initialize flow
  const flow = createAdminJourneyFlow(page);
  
  // Execute: Fluent Interface Flow
  // ✅ Reads like a story - easy to understand
  // ✅ Each method has testStep integration
  // ✅ State is managed automatically
  // ✅ Easy to compose flows
  
  await flow.loginAsAdmin();
  await flow.viewAssignOverview();
  await flow.createPersonAndVerify(TEST_PERSON_DATA); // ✅ Composed sub-flow
  await flow.requestDocumentUploadAndVerify(TEST_DOCUMENT_CONFIG);
  await flow.deletePerson(TEST_PERSON_DATA);
});

/**
 * Alternative: Use fullJourney composed method
 * 
 * This shows how easy it is to compose flows when you have
 * a complete journey that's used in multiple tests.
 */
test('Admin completes critical journey - using fullJourney @UI', async ({ page }) => {
  
  // Setup: Initialize flow
  const flow = createAdminJourneyFlow(page);
  
  // Execute: Single method call for full journey
  // ✅ Very concise and readable
  await flow.fullJourney(TEST_PERSON_DATA, TEST_DOCUMENT_CONFIG);
});

/**
 * Example: Partial flow - only create and verify person
 * 
 * This shows how easy it is to compose partial flows
 * when you only need certain steps.
 */
test('Admin creates and verifies person only @UI', async ({ page }) => {
  
  // Setup: Initialize flow
  const flow = createAdminJourneyFlow(page);
  
  // Execute: Only the steps you need
  await flow.loginAsAdmin();
  await flow.viewAssignOverview();
  await flow.createPersonAndVerify(TEST_PERSON_DATA);
  await flow.deletePerson(TEST_PERSON_DATA);
  
  // Optional: Access state if needed
  const personResult = flow.getPersonResult();
  console.log(`Created person with ID: ${personResult.personId}`);
});
