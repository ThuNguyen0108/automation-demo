import { CoreLibrary, PlaywrightInstance } from '@core';
import { PerformanceEntry } from 'perf_hooks';
import playwright from 'playwright';
import { AuditThresholds, IDiagnosticsUtil } from './diagnosticsUtil.interface';
import { Page } from 'playwright-core';

export class DiagnosticsUtil implements IDiagnosticsUtil {
    constructor() {}

    private get _page(): Page {
        return PlaywrightInstance.getInterface() as unknown as Page;
    }

    private get paths(): any {
        return CoreLibrary.paths;
    }

    public async getBrowserPerformanceMetrics(): Promise<Record<string, number>> {
        return await this._page.evaluate((): Record<string, number> => {
            const entries: PerformanceEntryList = performance.getEntriesByType('paint');
            const metrics: Record<string, number> = {};

            // Extract first-paint and round to 3 decimals
            const firstPaintEntry = entries.find(
                (entry): boolean => entry.name === 'first-paint',
            );

            metrics['firstPaint'] = firstPaintEntry
                ? firstPaintEntry.startTime
                : 0;

            // Extract firstContentfulPaint with consistent formatting
            const firstContentfulPaintEntry = entries.find(
                (entry): boolean => entry.name === 'first-contentful-paint',
            );

            metrics['firstContentfulPaint'] = firstContentfulPaintEntry
                ? firstContentfulPaintEntry.startTime
                : 0;

            // Use existing paint metrics for firstVisualChange
            const firstVisualChange: number = firstPaintEntry?.startTime || 0;
            metrics['firstVisualChange'] = firstVisualChange;

            // Add largestContentfulPaint using the PerformanceObserver API
            const largestContentfulPaintEntries: PerformanceEntryList =
                performance.getEntriesByType('largest-contentful-paint');

            metrics['largestContentfulPaint'] =
                largestContentfulPaintEntries.length
                    ? largestContentfulPaintEntries[0].startTime
                    : 0;

            // Add speed index (approximation)
            const firstPaint: number = metrics['first-paint'];
            const firstContentfulPaint: number = metrics['first-contentful-paint'];
            const largestContentfulPaint: number = metrics['largestContentfulPaint'];

            metrics['speed'] =
                firstPaint && firstContentfulPaint && largestContentfulPaint
                    ? (firstPaint +
                        firstContentfulPaint +
                        largestContentfulPaint) /
                    3
                    : 0;

            // Add lastVisualChange using the last paint or largest-contentful-paint as fallback
            const lastPaint: number = entries.length
                ? entries[entries.length - 1].startTime
                : 0;

            const fallbackLCP: number = metrics['largestContentfulPaint'] || 0;
            metrics['lastVisualChange'] = Math.max(lastPaint, fallbackLCP);

            // Add timeToFirstByte using Navigation Timing API
            const navigationTiming = performance.getEntriesByType(
                'navigation',
            )[0] as PerformanceNavigationTiming;

            metrics['timeToFirstByte'] = navigationTiming
                ? navigationTiming.responseStart - navigationTiming.startTime
                : 0;

            // Add serverResponseTime using Navigation Timing API
            metrics['serverResponseTime'] = navigationTiming
                ? navigationTiming.responseEnd - navigationTiming.responseStart
                : 0;

            // Add domContentLoaded using Navigation Timing API
            metrics['domContentLoaded'] = navigationTiming
                ? navigationTiming.domContentLoadedEventEnd -
                navigationTiming.startTime
                : 0;

            // Add load using Navigation Timing API
            metrics['load'] = navigationTiming
                ? navigationTiming.loadEventEnd - navigationTiming.startTime
                : 0;

            // Calculate cumulativeLayoutShift using Layout Shift API
            const layoutShiftEntries = performance.getEntriesByType(
                'layout-shift',
            ) as PerformanceEntry[];

            let cumulativeLayoutShift: number = 0;
            layoutShiftEntries.forEach((entry: any): void => {
                if (!entry.hadRecentInput) {
                    cumulativeLayoutShift += entry.value;
                }
            });

            metrics['cumulativeLayoutShift'] = cumulativeLayoutShift;

            // Add interactive metric approximation
            const longTasks = performance.getEntriesByType(
                'longtask',
            ) as PerformanceEntry[];

            const domContentLoaded: number = navigationTiming
                ? navigationTiming.domContentLoadedEventEnd
                : 0;

            const loadEventEnd: number = navigationTiming
                ? navigationTiming.loadEventEnd
                : 0;

            const interactive: number = longTasks.length
                ? Math.max(
                    domContentLoaded,
                    longTasks[longTasks.length - 1].startTime +
                    longTasks[longTasks.length - 1].duration,
                )
                : loadEventEnd;

            metrics['interactive'] = interactive;

            // Calculate Total Blocking Time (TBT)
            let totalBlockingTime: number = 0;
            longTasks.forEach((task: PerformanceEntry): void => {
                const blockingTime: number = task.duration - 50;
                if (blockingTime > 0) {
                    totalBlockingTime += blockingTime;
                }
            });

            metrics['totalBlockingTime'] = totalBlockingTime;

            return metrics;
        });
    }

    public async getMetrics(): Promise<{}> {
        const metrics: PerformanceEntryList = await this._page.evaluate(
            (): PerformanceEntryList => performance.getEntries(),
        );

        return metrics;
    }

    public async performLighthouseAudit(
        url: string,
        thresholds: AuditThresholds = {
            performance: 50,
            accessibility: 50,
            'best-practices': 50,
            seo: 50,
            pwa: 10,
        },
        debuggingPort: number = 9222,
    ): Promise<void> {
        try {
            // Move the playwright-lighthouse import here as a dynamic import
            const { playAudit } = await import('playwright-lighthouse');

            const browser = await playwright.chromium.launch({
                args: [`--remote-debugging-port=${debuggingPort}`],
            });

            const page: Page = await browser.newPage();
            await page.goto(url);

            const result = await playAudit({
                page,
                port: debuggingPort,
                thresholds: thresholds,
                reports: {
                    formats: {
                        json: false,
                        html: true,
                        csv: false,
                    },
                    name: `lighthouse-${new Date().toISOString()}`,
                    directory: this.paths.diagnostics,
                },
            });
        } catch (err: any) {
            throw new Error(
                `Error during Lighthouse audit: ${
                    err.stack !== undefined ? err.stack : err.message
                }`,
            );
        }
    }
}
