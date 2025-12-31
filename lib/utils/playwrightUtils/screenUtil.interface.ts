import { Locator } from 'playwright-core';

export interface IScreenUtil {
    /**
     * Takes a screenshot of the viewport or full page
     *
     * @param fileName Optional base name for the screenshot file
     * @param fullPage Optional parameter to capture the whole page, not just viewport
     */
    screenshot(fileName?: string, fullPage?: boolean): Promise<string>;

    /**
     * Takes a screenshot of a specific element
     *
     * @param selector The selector for the element to screenshot
     * @param fileName Optional base name for the screenshot file
     */
    screenshotElement(
        selector: string | Locator,
        fileName?: string,
    ): Promise<string>;

    /**
     * Captures DOM snapshot (HTML) of the current page or specific element
     * Useful for debugging failed tests - helps identify locators and page state
     *
     * @param fileName Optional base name for the DOM snapshot file
     * @param selector Optional selector to capture only a specific element's HTML
     */
    captureDOM(
        fileName?: string,
        selector?: string | Locator,
    ): Promise<string>;

    /**
     * Captures screenshot and DOM snapshot together
     * Useful for comprehensive failure debugging
     *
     * @param fileName Optional base name for the files
     * @param fullPage Whether to capture full page screenshot
     * @param captureDOM Whether to also capture DOM snapshot
     */
    captureScreenshotWithDOM(
        fileName?: string,
        fullPage?: boolean,
        captureDOM?: boolean,
    ): Promise<{ screenshot: string; dom?: string }>;

    /**
     *
     * @param name - simple description shows in the report
     * @param filePath - path to the attachment - expects fully resolved path
     * @param contentType can be any of the contentTypes supplied here: node_modules/allure-js-commons/dist/types/model.d.ts
     * @private
     */
    attachToReports(
        name: string,
        filePath: string,
        contentType: string,
    ): Promise<void>;
}
