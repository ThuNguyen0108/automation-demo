export interface IDiagnosticsUtil {
    /**
     * Retrieves various browser performance metrics from the provide page.
     *
     * This function evaluates performance metrics from the browser's performance API to extract and calculate
     * metrics such as paint timings, cumulative layout shift, time-to-first-byte, total blocking time and more.
     *
     * @returns {Promise<Record<string, number>>} A promise that resolve to an object containing performance metrics.
     */
    getBrowserPerformanceMetrics: () => Promise<Record<string, number>>;

    /**
     * Retrieves all performance metrics from the current page using browser's Performance API.
     *
     * This function evaluates the `performance.getEntries()` method on the current page and returns
     * the collected performance metrics.
     *
     * @returns {Promise<{}>} A promise that resolve to an object containing all performance metrics from the page.
     */
    getMetrics: () => Promise<{}>;

    /**
     * Perform a Lighthouse audit for the current test page.
     *
     * @param {string} url - The page's URL
     * @param {number} debuggingPort - The remote debugging port (default: 9222)
     */
    performLighthouseAudit: (
        url: string,
        thresholds: AuditThresholds,
        debuggingPort: number,
    ) => Promise<void>;
}

export interface AuditThresholds {
    performance: number;
    accessibility: number;
    'best-practices': number;
    seo: number;
    pwa: number;
}
