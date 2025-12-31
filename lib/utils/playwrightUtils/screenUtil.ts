import { test } from '@playwright/test';
import * as allure from 'allure-js-commons';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Locator, Page } from 'playwright-core';
import { CoreLibrary, PlaywrightInstance } from '@core';
import { IScreenUtil } from './screenUtil.interface';

export class ScreenUtil implements IScreenUtil {

    private get _page(): Page {
        return PlaywrightInstance.getInterface() as unknown as Page;
    }

    private get paths(): any {
        return CoreLibrary.paths;
    }

    private generateFileName(fileName?: string, ext?: string): string {
        const timestamp: string = new Date().toISOString().replace(/[:.]/g, '-');
        const sanitizedName: string = (fileName || 'screenshot')
            .replace(/[^a-zA-Z0-9-_]/g, '')
            .replace(/^-+|-+$/g, '');
        return `${sanitizedName}_${timestamp}${ext || '.png'}`;
    }

    private generateFilePath(fileName: string): string {
        return path.join(this.paths.screenshots, fileName);
    }

    public async screenshot(
        fileName?: string,
        fullPage: boolean = true,
    ): Promise<string> {
        const sanitizedName: string = this.generateFileName(fileName, '.png');
        const filePath: string = this.generateFilePath(sanitizedName);

        await this._page.screenshot({ path: filePath, fullPage: fullPage });

        // Attach to both Playwright and Allure reports
        await this.attachToReports(sanitizedName, filePath);

        return filePath;
    }

    public async screenshotElement(
        selector: string | Locator,
        fileName?: string,
    ): Promise<string> {
        const sanitizedName: string = this.generateFileName(
            fileName || 'element',
            '.png',
        );

        const filePath: string = this.generateFilePath(sanitizedName);

        const element: Locator =
            typeof selector === 'string'
                ? this._page.locator(selector)
                : selector;

        // Wait for element to be visible
        await element.waitFor({ state: 'visible' });

        // Get element boundaries
        const boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | null = await element.boundingBox();

        if (!boundingBox) {
            throw new Error('Element for Screenshot not found or not visible');
        }

        // Take screenshot of the specific element
        await element.screenshot({
            path: filePath,
            animations: 'disabled',
            scale: 'css',
        });

        // Attach to both Playwright and Allure reports
        await this.attachToReports(sanitizedName, filePath);

        return filePath;
    }

    /**
     * Captures DOM snapshot (HTML) of the current page or specific element
     * Useful for debugging failed tests - helps identify locators and page state
     * 
     * @param fileName Optional base name for the DOM snapshot file
     * @param selector Optional selector to capture only a specific element's HTML
     * @returns Path to the saved DOM snapshot file
     */
    public async captureDOM(
        fileName?: string,
        selector?: string | Locator,
    ): Promise<string> {
        const sanitizedName: string = this.generateFileName(
            fileName || 'dom-snapshot',
            '.html',
        );
        const filePath: string = this.generateFilePath(sanitizedName);

        let htmlContent: string;

        if (selector) {
            // Capture DOM of specific element
            const element: Locator =
                typeof selector === 'string'
                    ? this._page.locator(selector)
                    : selector;

            htmlContent = await element.innerHTML();
            
            // Wrap in a readable HTML structure
            htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DOM Snapshot - ${sanitizedName}</title>
    <style>
        body { font-family: monospace; margin: 20px; background: #f5f5f5; }
        pre { background: white; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .selector-info { background: #e3f2fd; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="selector-info">
        <strong>Element Selector:</strong> ${typeof selector === 'string' ? selector : 'Locator object'}
    </div>
    <pre>${this.escapeHtml(htmlContent)}</pre>
</body>
</html>`;
        } else {
            // Capture full page DOM
            htmlContent = await this._page.content();
        }

        // Save to file
        await fs.writeFile(filePath, htmlContent, 'utf-8');

        // Attach to both Playwright and Allure reports
        await this.attachToReports(sanitizedName, filePath, 'text/html');

        return filePath;
    }

    /**
     * Captures screenshot and DOM snapshot together
     * Useful for comprehensive failure debugging
     * 
     * @param fileName Optional base name for the files
     * @param fullPage Whether to capture full page screenshot
     * @param captureDOM Whether to also capture DOM snapshot
     * @returns Object with paths to screenshot and DOM files
     */
    public async captureScreenshotWithDOM(
        fileName?: string,
        fullPage: boolean = true,
        captureDOM: boolean = true,
    ): Promise<{ screenshot: string; dom?: string }> {
        const baseFileName = fileName || 'failure-capture';
        const screenshotPath = await this.screenshot(baseFileName, fullPage);
        
        let domPath: string | undefined;
        if (captureDOM) {
            domPath = await this.captureDOM(`${baseFileName}-dom`);
        }

        return {
            screenshot: screenshotPath,
            dom: domPath,
        };
    }

    /**
     * Helper method to escape HTML characters for safe display
     */
    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    public async attachToReports(
        name: string,
        filePath: string,
        contentType: string = 'image/png',
    ): Promise<void> {
        try {
            // Attach to Playwright test report
            await test.info().attach(name, {
                path: filePath,
                contentType: contentType,
            });
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }

        try {
            // Attach to Allure report
            await allure.attachment(name, filePath, contentType);
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }
}
