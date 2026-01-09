import * as os from 'node:os';
import path from 'node:path';
import {
    PlaywrightTestConfig,
    ReporterDescription,
    ScreenshotMode,
    TraceMode,
} from '@playwright/test';
import { devices } from 'playwright';
import { UserOverrides, PlaywrightInstance, IPlaywrightLibrary } from '.';
import { PathUtil } from '@utils';

/**
 * See https://playwright.dev/docs/test-configuration.
 */

const pathUtil = new PathUtil();

let qe_tags: string | RegExp | undefined;


function setupPlaywrightConfig(): void {
    if (process.env.QE_CONFIG_ID === undefined) {
        try {
            let configLine: string =
                (new Error().stack as string)
                    .split('\n')
                    .find(
                        (line: string): boolean =>
                            line.trim().startsWith('at Object.<anonymous>') &&
                            line.endsWith('.ts:1:1') &&
                            !line.includes('node_modules') &&
                            line.includes(process.cwd()),
                    ) || '';
            const regex = /at Object\.<anonymous> \((.+?)\:(\w+\.ts):1:1\)/;
            const match: RegExpMatchArray | null = configLine.match(regex);
            if (match && match[1] && match[2]) {
                process.env.QE_CONFIG_PATH = match[1];
                process.env.QE_CONFIG_ID = match[2];
            }
        } catch (err: any) {
            // no log for failure, just default results
        }
    }
}

export function sharedConfig(overrides: UserOverrides): PlaywrightTestConfig {
    // DEBUG: Track execution order - Note: LogUtil may not be initialized yet
    // Use process.stdout.write for early logging before CoreLibrary is initialized
    process.stdout.write(`[EXECUTION ORDER] Phase 1: sharedConfig() started\n`);
    process.stdout.write(`[EXECUTION ORDER] QE_CONFIG_ID before setupPlaywrightConfig(): ${process.env.QE_CONFIG_ID || 'UNDEFINED'}\n`);
    
    if (process.env.QE_CONFIG_ID === undefined) {
        process.stdout.write(`[EXECUTION ORDER] Calling setupPlaywrightConfig() to auto-detect QE_CONFIG_ID\n`);
        setupPlaywrightConfig();
        process.stdout.write(`[EXECUTION ORDER] After setupPlaywrightConfig() - QE_CONFIG_ID: ${process.env.QE_CONFIG_ID || 'UNDEFINED'}\n`);
    }
    
    if (process.env.QE_CONFIG_ID === undefined) {
        // Try to extract from --config argument
        process.stdout.write(`[EXECUTION ORDER] Trying to extract QE_CONFIG_ID from --config argument\n`);
        const configArg = process.argv.find(arg => arg.startsWith('--config') || arg.startsWith('-c'));
        if (configArg) {
            const configPath = configArg.includes('=') ? configArg.split('=')[1] : process.argv[process.argv.indexOf(configArg) + 1];
            if (configPath) {
                const configFileName = path.basename(configPath, path.extname(configPath));
                process.env.QE_CONFIG_ID = configFileName;
                process.stdout.write(`[EXECUTION ORDER] Extracted QE_CONFIG_ID from --config: ${process.env.QE_CONFIG_ID}\n`);
                if (!process.env.QE_CONFIG_PATH) {
                    process.env.QE_CONFIG_PATH = path.dirname(configPath);
                }
            }
        }
    }
    
    if (process.env.QE_CONFIG_ID === undefined && process.argv[4] !== undefined) {
        process.stdout.write(`[EXECUTION ORDER] Trying to extract QE_CONFIG_ID from process.argv[4]\n`);
        const userConfig: string = process.argv[4];
        process.env.QE_CONFIG_ID = (userConfig.split(path.sep).pop() ?? '').replace('.ts', '');
        process.stdout.write(`[EXECUTION ORDER] Extracted QE_CONFIG_ID from argv[4]: ${process.env.QE_CONFIG_ID}\n`);
    }
    
    // Final fallback
    if (process.env.QE_CONFIG_ID === undefined) {
        process.env.QE_CONFIG_ID = 'web';
        process.stdout.write(`[EXECUTION ORDER] Using FALLBACK value: QE_CONFIG_ID = 'web'\n`);
    }
    
    process.stdout.write(`[EXECUTION ORDER] Final QE_CONFIG_ID: ${process.env.QE_CONFIG_ID}\n`);

    if (process.env.QE_ALLURE_DIR === undefined)
        process.env.QE_ALLURE_DIR = pathUtil.sanitizeDirectory([
            process.cwd(),
            'build',
            'logs',
            process.env.QE_CONFIG_ID!,
            'allure',
        ]);

    let allureResults: string = pathUtil.sanitizeDirectory([
        process.env.QE_ALLURE_DIR,
        'results',
    ]);

    if (process.env.QE_PLAYWRIGHT_DIR === undefined)
        process.env.QE_PLAYWRIGHT_DIR = pathUtil.sanitizeDirectory([
            process.cwd(),
            'build',
            'logs',
            process.env.QE_CONFIG_ID!,
            'playwright',
        ]);

    let playwrightReport: string = pathUtil.sanitizeDirectory([
        process.env.QE_PLAYWRIGHT_DIR,
        'report',
    ]);
    let playwrightResults: string = pathUtil.sanitizeDirectory([
        process.env.QE_PLAYWRIGHT_DIR,
        'results',
    ]);


    new PlaywrightInstance(overrides);
    const qe: IPlaywrightLibrary = PlaywrightInstance.get();
    qe_tags = overrides.tags;

    const qe_reporter: ReporterDescription[] = [
        [
            'allure-playwright',
            {
                detail: true,
                suiteTitle: false,
                resultsDir: allureResults,
                environmentInfo: {
                    framework: 'QE Playwright',
                    os_platform: os.platform(),
                    os_release: os.release(),
                    os_version: os.version(),
                    node_version: process.version,
                    // instantiate the test instance
                    qeConfigPath: process.env.QE_CONFIG_PATH,
                },
            },
        ],
    ];

    const isCI: boolean = process.platform === 'linux';

    const pwConfig = {
        outputDir: playwrightResults,
        testDir: './tests',
        testMatch: '**/*.spec.ts',
        preserveOutput: 'always' as const,
        /* Run tests in files in parallel */
        fullyParallel: true,
        /* Fail the build on CI if you accidentally left test.only in the source code. */
        forbidOnly: !!isCI,
        /* Retry on CI only */
        retries: isCI ? overrides.projectProps.retriesCI : overrides.projectProps.retries,
        /* Opt out of parallel tests on CI. */
        workers: isCI
            ? overrides.projectProps.maxWorkersCI
            : overrides.projectProps.maxWorkers,
        /* Reporter to use. See https://playwright.dev/docs/test-reporters */
        reporter: [
            ['html', { outputFolder: playwrightReport, open: 'never' }],
            ...qe_reporter, // Allure reporter
        ] as ReporterDescription[],
        /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
        use: {
            /* Base URL to use in actions like `await page.goto('/')`. */
            //baseURL: qe.envProps.get('baseUrl') || 'http://127.0.0.1:3000',
            /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
            trace: 'on-first-retry' as TraceMode,
            /* Options: 'on', 'off', 'only-on-failure' */
            screenshot: 'only-on-failure' as ScreenshotMode,
            eyesConfig: {
                /* The following and other configuration parameters are documented at: https://applitools.com/tutorials/playwright/api/overview */
               // apiKey: qe.projectProps.applitools.apiKey, // alternatively, set this via environment variable APPLITOOLS_API_KEY
               // serverUrl: qe.projectProps.applitools.url,

                // failTestsOnDiff: false,
                // appName: 'My App',
                // matchLevel: 'Strict',
                // batch: { name: 'My Batch' },
                // proxy: { url: 'http://127.0.0.1:8888' },
                // stitchMode: 'CSS',
                // matchTimeout: 0,
                // waitBeforeScreenshots: 50,
                // saveNewTests: true,
            },
        },
        /* Configure projects for major browsers */
        projects: [PROJECT_CONFIGS.browser.edge(), PROJECT_CONFIGS.backend()],
        // HOOKS
        // globalSetup: setup,
        // globalTeardown: teardown,
        /* Run your local dev server before starting the tests */
        // webServer: {
        //     command: 'npm run start',
        //     url: 'http://127.0.0.1:3000',
        //     reuseExistingServer: isCI,
        // },
    };

    return pwConfig;
}

function getTags(): string | RegExp | undefined {
    return qe_tags || undefined;
}

const setupUI = {
    fullyParallel: true,
    headless: process.env.HEADLESS || true,
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
    deviceScaleFactor: 1,
    launchOptions: {
        logger: {
            isEnabled: (name: any, severity: any): boolean => true, // This works though: isEnabled: (name) => true (but only gives logs for 'protocol')
            log: (name: any, severity: any, message: any): boolean =>
                process.stdout.write(`buffer: ${name}:${severity}:${message}\n`),
        },
    },
};

const setupANDROID = {
    retries: 0,
};

const setupIOS = {
    retries: 0,
};

export const PROJECT_CONFIGS = {
    /* Non UI tests like API, DB or other infrastructure (S3 etc.) */
    backend: () =>
        ({
            name: 'Back End',
        }),

    /* User Experience tests against branded browsers. */
    browser: {
        edge: () =>
            ({
                name: 'MS Edge',
                use: { ...devices['Desktop Edge'], channel: 'msedge' },
                ...setupUI,
                grep: getTags(),
            }),

        edgeBETA: () =>
            ({
                name: 'MS Edge',
                use: { ...devices['Desktop Edge'], channel: 'msedge-beta' },
                ...setupUI,
                grep: getTags(),
            }),

        edgeDEV: () =>
            ({
                name: 'MS Edge',
                use: { ...devices['Desktop Edge'], channel: 'msedge-dev' },
                ...setupUI,
                grep: getTags(),
            }),

        edgeCANARY: () =>
            ({
                name: 'MS Edge',
                use: { ...devices['Desktop Edge'], channel: 'msedge-canary' },
                ...setupUI,
                grep: getTags(),
            }),

        chrome: () =>
            ({
                name: 'Google Chrome',
                use: { ...devices['Desktop Chrome'], channel: 'chrome' },
                ...setupUI,
                grep: getTags(),
            }),

        chromeBETA: () =>
            ({
                name: 'Google Chrome',
                use: { ...devices['Desktop Chrome'], channel: 'chrome-beta' },
                ...setupUI,
                grep: getTags(),
            }),

        chromeDEV: () =>
            ({
                name: 'Google Chrome',
                use: { ...devices['Desktop Chrome'], channel: 'chrome-dev' },
                ...setupUI,
                grep: getTags(),
            }),

        chromeCANARY: () =>
            ({
                name: 'Google Chrome',
                use: { ...devices['Desktop Chrome'], channel: 'chrome-canary' },
                ...setupUI,
                grep: getTags(),
            }),

        firefox: () =>
            ({
                name: 'firefox',
                use: { ...devices['Desktop Firefox'] },
                ...setupUI,
                grep: getTags(),
            }),

        safari: () =>
            ({
                name: 'webkit',
                use: { ...devices['Desktop Safari'] },
                ...setupUI,
                grep: getTags(),
            }),
    },

    /*
     * User experience tests against mobile viewports - not devices!
     * Further devices are captured here:
     * https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json
     *
     * Use the key you require (name of the device) between the array brackets as a string like the examples below
     *
     * NOTE: Mobile features use Webkit or Chrome which are often blocked by NAB Workplace Security
     * Please follow up any issues you have in the chats
     */
    mobile: {
        Pixel7: () =>
            ({
                name: 'Pixel 7',
                use: { ...devices['Pixel 7'] },
                ...setupANDROID,
                grep: getTags(),
            }),

        iPhone15ProMax: () =>
            ({
                name: 'iPhone 15 Pro Max',
                use: { ...devices['iPhone 15 Pro Max'] },
                ...setupIOS,
                grep: getTags(),
            }),
    },
};

