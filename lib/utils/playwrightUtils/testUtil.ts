import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { Page } from 'playwright-core';
import { PlaywrightInstance } from '@core';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * TestUtil - Enhanced Logging and Reporting Utilities
 * 
 * These utilities help create better test reports with:
 * - Structured test steps with Allure integration
 * - Automatic DOM capture on failure
 * - Enhanced screenshot attachments
 */

/**
 * Execute a test step with Allure and Playwright step integration
 * 
 * @param stepName Name of the step (displayed in reports)
 * @param stepFn Function to execute as the step
 * @returns Result of stepFn
 * 
 * @example
 * await testStep('Login to application', async () => {
 *   await loginPage.login();
 * });
 */
export async function testStep<T>(
    stepName: string,
    stepFn: () => Promise<T> | T,
): Promise<T> {
    // Execute within Playwright test.step (for Playwright HTML report)
    return await test.step(stepName, async () => {
        // Execute within Allure step (for Allure report)
        return await allure.step(stepName, async () => {
            return await stepFn();
        });
    });
}

/**
 * Capture DOM snapshot of current page
 * Useful for debugging failed tests - helps identify locators
 * 
 * @param page Playwright Page object
 * @param fileName Optional file name for the DOM snapshot
 * @param selector Optional selector to capture only specific element
 * @returns Path to saved DOM file
 */
export async function captureDOMSnapshot(
    page: Page,
    fileName?: string,
    selector?: string,
): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedName = (fileName || 'dom-snapshot')
        .replace(/[^a-zA-Z0-9-_]/g, '')
        .replace(/^-+|-+$/g, '');
    
    const qe = PlaywrightInstance.get(page);
    const filePath = path.join(
        qe.paths.screenshots,
        `${sanitizedName}_${timestamp}.html`,
    );

    let htmlContent: string;

    if (selector) {
        // Capture DOM of specific element
        const element = page.locator(selector);
        
        // Check if element exists
        const count = await element.count();
        if (count === 0) {
            throw new Error(`Element with selector "${selector}" not found on page`);
        }
        
        // Wait for element to be attached to DOM
        await element.first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => {
            // Element might not be attached, continue anyway
        });
        
        // Get innerHTML - use first() to ensure we get a single element
        htmlContent = await element.first().innerHTML();
        
        // Wrap in readable HTML structure
        htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DOM Snapshot - ${sanitizedName}</title>
    <style>
        body { font-family: monospace; margin: 20px; background: #f5f5f5; }
        pre { background: white; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .selector-info { background: #e3f2fd; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
        .error-info { background: #ffebee; padding: 10px; margin-bottom: 10px; border-radius: 4px; color: #c62828; }
    </style>
</head>
<body>
    <div class="selector-info">
        <strong>Element Selector:</strong> ${selector}<br>
        <strong>Element Count:</strong> ${count}<br>
        <strong>Timestamp:</strong> ${new Date().toISOString()}
    </div>
    <pre>${escapeHtml(htmlContent)}</pre>
</body>
</html>`;
    } else {
        // Capture full page DOM
        htmlContent = await page.content();
    }

    // Save to file
    await fs.writeFile(filePath, htmlContent, 'utf-8');

    // Attach to Playwright report (must be called within test context)
    try {
        const testInfo = test.info();
        await testInfo.attach(`${sanitizedName}-dom`, {
            path: filePath,
            contentType: 'text/html',
        });
    } catch (err) {
        // Ignore if not in test context
    }

    // Attach to Allure report
    try {
        await allure.attachment(`${sanitizedName}-dom`, filePath, 'text/html');
    } catch (err) {
        // Ignore attachment errors
    }

    return filePath;
}

/**
 * Capture screenshot and DOM snapshot together
 * Useful for comprehensive failure debugging
 * 
 * @param page Playwright Page object
 * @param fileName Optional base name for files
 * @param fullPage Whether to capture full page screenshot
 * @param domSelector Optional selector to capture specific element DOM instead of full page
 * @returns Object with paths to screenshot and DOM files
 */
export async function captureFailureArtifacts(
    page: Page,
    fileName?: string,
    fullPage: boolean = true,
    domSelector?: string,
): Promise<{ screenshot?: string; dom?: string; domElement?: string }> {
    const baseFileName = fileName || 'failure-capture';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    let screenshotPath: string | undefined;
    let domPath: string | undefined;
    let domElementPath: string | undefined;
    
    try {
        const qe = PlaywrightInstance.get(page);
        
        // Capture screenshot (only if page is still open)
        try {
            screenshotPath = path.join(
                qe.paths.screenshots,
                `${baseFileName}_${timestamp}.png`,
            );
            await page.screenshot({ path: screenshotPath, fullPage });
            
            // Attach screenshot to reports
            try {
                const testInfo = test.info();
                await testInfo.attach(`${baseFileName}-screenshot`, {
                    path: screenshotPath,
                    contentType: 'image/png',
                });
            } catch (err) {
                // Ignore if not in test context
            }
            
            try {
                await allure.attachment(`${baseFileName}-screenshot`, screenshotPath, 'image/png');
            } catch (err) {
                // Ignore attachment errors
            }
        } catch (err: any) {
            // Page might be closed, skip screenshot
            console.warn(`Failed to capture screenshot: ${err.message}`);
        }

        // Capture full page DOM (only if page is still open)
        try {
            domPath = await captureDOMSnapshot(page, `${baseFileName}-dom`);
        } catch (err: any) {
            // Page might be closed, skip DOM capture
            console.warn(`Failed to capture DOM: ${err.message}`);
        }
        
        // Capture specific element DOM if selector provided
        if (domSelector) {
            try {
                const element = page.locator(domSelector);
                const isVisible = await element.isVisible().catch(() => false);
                if (isVisible) {
                    domElementPath = await captureDOMSnapshot(
                        page,
                        `${baseFileName}-dom-element`,
                        domSelector
                    );
                }
            } catch (err: any) {
                // Element might not exist, skip element DOM capture
                console.warn(`Failed to capture element DOM (${domSelector}): ${err.message}`);
            }
        }
    } catch (err: any) {
        // If PlaywrightInstance.get fails, page is likely closed
        console.warn(`Failed to capture failure artifacts: ${err.message}`);
    }

    return {
        screenshot: screenshotPath,
        dom: domPath,
        domElement: domElementPath,
    };
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Capture artifacts when test fails
 * This should be called in a test's catch block or afterEach hook
 * 
 * @param page Playwright Page object
 * @param fileName Optional file name prefix
 * 
 * @example
 * test('my test', async ({ page }) => {
 *   try {
 *     // ... test code
 *   } catch (error) {
 *     await captureFailureArtifacts(page, 'my-test-failure');
 *     throw error;
 *   }
 * });
 */

