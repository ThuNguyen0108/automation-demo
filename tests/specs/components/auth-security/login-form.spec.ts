import { test, expect } from '@playwright/test';
import { PlaywrightInstance } from '@core';
import { createComponentFlow } from '@tests/flows/BaseFlow';

type LoginTestCase = {
  name: string;
  email: string;
  password: string;
  expectedResult: 'success' | 'failure';
  expectedError?: string;
};

const LOGIN_TEST_DATA: LoginTestCase[] = [
  {
    name: 'Valid admin credentials',
    email: 'nguyen.thu@speedydd.com',
    password: 'Abc123456#',
    expectedResult: 'success'
  },
  {
    name: 'Valid user credentials',
    email: 'auto-speedydd-02@outlook.com',
    password: 'Abc123456@',
    expectedResult: 'success'
  },
  {
    name: 'Invalid password',
    email: 'nguyen.thu@speedydd.com',
    password: 'WrongPassword',
    expectedResult: 'failure',
    expectedError: 'Invalid credentials'
  },
  {
    name: 'Invalid email format',
    email: 'invalid@.com',
    password: 'Abc123456#',
    expectedResult: 'failure',
    expectedError: 'Invalid email format'
  }
];

test.describe('Login Form Component - Data-Driven @components', () => {

  for (const testCase of LOGIN_TEST_DATA) {
    test(`${testCase.name} - ${testCase.expectedResult}`, async ({ page }) => {
      const flow = createComponentFlow(page);

      await flow.standardLogin(testCase.email, testCase.password);
    });
  }
});
