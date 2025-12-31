import { Locator, Page } from 'playwright-core';
import { PlaywrightInstance } from '@core';
import { IWaitUtils } from './waitUtil.interface';

type LocatorType = string | string[] | Locator;

export class WaitUtil implements IWaitUtils {
    _defaultWaitTime: number;
    _defaultInterval: number;

    constructor(defaultWaitTime?: number, defaultInterval?: number) {
        this._defaultWaitTime = defaultWaitTime || 30000; // 30s
        this._defaultInterval = defaultInterval || 1000; // 1s
    }

    private get _page(): Page {
        return PlaywrightInstance.getInterface() as unknown as Page;
    }

    public async duration(waitTime: number): Promise<void> {
        await this._page.waitForTimeout(waitTime);
    }

    public async forPageLoad(waitTime?: number): Promise<boolean> {
        try {
            await this._page.waitForFunction(
                () => document.readyState === 'complete',
                { timeout: waitTime || this._defaultWaitTime }
            );
            return true;
        } catch (err: any) {
            throw new Error(
                `Page took too long to load - ${
                    err.stack !== undefined ? err.stack : err.message
                }`
            );
        }
    }

    public async forAnotherPageLoad(waitTime?: number): Promise<boolean> {
        try {
            const timeout: number = waitTime || this._defaultWaitTime;

            const [newPage] = await Promise.all([
                this._page.context().waitForEvent('page'),
                { timeout },
            ]);

            await newPage.waitForLoadState('load', { timeout });
            return true;
        } catch (err: any) {
            throw new Error(
                `Another new page or tab took too long to load - ${
                    err.stack !== undefined ? err.stack : err.message
                }`
            );
        }
    }

    public async forClickable(
        locator: LocatorType,
        waitTime?: number
    ): Promise<boolean> {
        const timeout: number = waitTime || this._defaultWaitTime;

        try {
            const locators: Locator[] = this.getLocators(locator);
            for (const locator of locators) {
                await locator.click({ timeout, trial: true });
            }
            return true;
        } catch (err: any) {
            console.error(
                `Object(s) were not clickable: ${
                    err.stack !== undefined ? err.stack : err.message
                }`
            );
            return false;
        }
    }

    public async forDisplayed(
        locator: LocatorType,
        waitTime?: number
    ): Promise<boolean> {
        const timeout: number = waitTime || this._defaultWaitTime;

        try {
            const locators: Locator[] = this.getLocators(locator);
            for (const locator of locators) {
                if (!(await this.waitForVisibility(locator, timeout))) {
                    console.error(`Object(s) were not displayed: ${String(locator)}`);
                    return false;
                }
            }
            return true;
        } catch (err: any) {
            console.error(
                `Error while checking visibility: ${
                    err.stack !== undefined ? err.stack : err.message
                }`
            );
            return false;
        }
    }

    /**
     * Retrieves all locators by type
     * @param waitTime in milliseconds
     * @param locator Element locator(s) in types of string | string[] | Locator
     * @returns List of Locators
     */
    private getLocators(locator: LocatorType): Locator[] {
        const locators: Locator[] = [];

        if (typeof locator === 'string') {
            locators.push(this._page.locator(locator));
        } else if (Array.isArray(locator)) {
            for (const sel of locator) {
                locators.push(this._page.locator(sel));
            }
        } else {
            locators.push(locator);
        }

        return locators;
    }

    /**
     * Wait for a Playwright Locator is visible
     * @param locator Playwright Locator
     * @param timeout in milliseconds
     * @param interval in milliseconds
     * @returns Promise<boolean>
     */
    private async waitForVisibility(
        locator: Locator,
        timeout?: number,
        interval?: number
    ): Promise<boolean> {
        let currentTimeout: number = timeout || this._defaultWaitTime;
        const currentInterval: number = interval || this._defaultInterval;

        while (currentTimeout > 0) {
            if (await locator.isVisible()) return true;
            await this._page.waitForTimeout(currentInterval);
            currentTimeout -= currentInterval;
        }

        return false;
    }
}
