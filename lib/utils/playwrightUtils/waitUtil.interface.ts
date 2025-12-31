import { Locator } from 'playwright-core';

type LocatorType = string | string[] | Locator;

export interface IWaitUtils {
    /**
     * Waits for duration in milliseconds
     * @param waitTime timeout in milliseconds
     * @returns
     */
    duration: (waitTime: number) => Promise<void>;

    /**
     * Waits for page to be fully loaded
     * @param waitTime timeout in milliseconds
     * @returns Promise<boolean>
     */
    forPageLoad: (waitTime?: number) => Promise<boolean>;

    /**
     * Waits for new tab or page to be loaded
     * @param waitTime timeout in milliseconds
     * @returns Promise<boolean>
     */
    forAnotherPageLoad: (waitTime?: number) => Promise<boolean>;

    /**
     * Waits for locator to be clickable
     * @param locator Element locator(s) in types of string | string[] | Locator
     * @param waitTime timeout in milliseconds
     * @returns Promise<boolean>
     */
    forClickable: (
        locator: LocatorType,
        waitTime?: number
    ) => Promise<boolean>;

    /**
     * Waits for locator to be displayed
     * @param locator Element locator(s) in types of string | string[] | Locator
     * @param waitTime timeout in milliseconds
     * @param interval time interval in milliseconds
     * @returns Promise<boolean>
     */
    forDisplayed: (
        locator: LocatorType,
        waitTime?: number,
        interval?: number
    ) => Promise<boolean>;
}
