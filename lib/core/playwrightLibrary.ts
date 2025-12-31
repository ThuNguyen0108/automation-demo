import {
    CoreInstance,
    CoreMaps,
    GetCurrentMap,
    ICoreLibrary,
    UserOverrides,
} from '.';
import { merge } from 'lodash';
import {
    APIUtil,
    ApplitoolsUtil,
    BrowserUtil,
    DiagnosticsUtil,
    IAPIUtil,
    IApplitoolsUtil,
    IBrowserUtil,
    IDiagnosticsUtil,
    IMockRouteUtil,
    IScreenUtil,
    ISupportUtil,
    IUIUtil,
    IWaitUtils,
    MockRouteUtil,
    ScreenUtil,
    SupportUtil,
    UIUtil,
    WaitUtil,
} from '@playwrightUtils';
import {
    IPlaywrightLibrary,
    IPlaywrightProjectProps,
} from './playwrightLibrary.interface';
import {
    MatchLevel,
    BrowserType,
    DeviceName,
    ScreenOrientation,
} from '@applitools/eyes-playwright';

export class PlaywrightLibrary {
    private static _instance: PlaywrightLibrary;
    private static _core: ICoreLibrary;

    public static _allData: Map<string, Map<string, any>>;
    public static _testData: Map<string, any>;
    public static _obj: GetCurrentMap;
    public static _env: GetCurrentMap;
    public static _dbQueries: Map<string, any>;
    public static _txn: Map<string, any>;

    static playwrightProjectProps: IPlaywrightProjectProps;

    private static api: IAPIUtil;
    private static visual: IApplitoolsUtil;
    private static browser: IBrowserUtil;
    private static diagnostics: IDiagnosticsUtil;
    private static mockRoute: IMockRouteUtil;
    private static screen: IScreenUtil;
    private static support: ISupportUtil;
    private static ui: IUIUtil;
    private static wait: IWaitUtils;

    // public static ally: IAllyUtil;

    constructor() {
        PlaywrightLibrary._obj = new GetCurrentMap((): Map<string, any> => CoreMaps._obj);
        PlaywrightLibrary._env = new GetCurrentMap((): Map<string, any> => CoreMaps._env);
    }

    public static get instance(): PlaywrightLibrary {
        if (!PlaywrightLibrary._instance) {
            PlaywrightLibrary._instance = new PlaywrightLibrary();
        }
        return this._instance;
    }

    public get(overrides: UserOverrides): IPlaywrightLibrary {
        PlaywrightLibrary._core = CoreInstance.get;
        PlaywrightLibrary.playwrightProjectProps = merge(
            PlaywrightLibrary._core.projectProps,
            this.playwrightDefaultProps(),
            overrides.projectProps,
        ) as IPlaywrightProjectProps;

        const playwrightLibrary: IPlaywrightLibrary = {
            // core props
            process: PlaywrightLibrary._core.process,
            paths: PlaywrightLibrary._core.paths,

            // CoreMaps
            allData: PlaywrightLibrary._allData,
            testData: PlaywrightLibrary._testData,
            objProps: PlaywrightLibrary._obj,
            dbQueries: PlaywrightLibrary._dbQueries,
            envProps: PlaywrightLibrary._env,
            txnMap: PlaywrightLibrary._txn,
            data: PlaywrightLibrary._core.data,
            files: PlaywrightLibrary._core.files,
            // api: PlaywrightLibrary._core.api,
            confluence: PlaywrightLibrary._core.confluence,
            darkly: PlaywrightLibrary._core.darkly,
            db: PlaywrightLibrary._core.db,
            OS: PlaywrightLibrary._core.OS,
            qTest: PlaywrightLibrary._core.qTest,
            tvt: PlaywrightLibrary._core.tvt,
            log: PlaywrightLibrary._core.log,
            // support: PlaywrightLibrary._core.support,
            txn: PlaywrightLibrary._core.txn,

            // Playwright libraries
            // ally: PlaywrightLibrary.ally,
            projectProps: PlaywrightLibrary.playwrightProjectProps,
            ui: PlaywrightLibrary.ui || new UIUtil(),
            diagnostics: PlaywrightLibrary.diagnostics || new DiagnosticsUtil(),
            mockRoute: PlaywrightLibrary.mockRoute || new MockRouteUtil(),
            browser: PlaywrightLibrary.browser || new BrowserUtil(),
            screen: PlaywrightLibrary.screen || new ScreenUtil(),
            wait: PlaywrightLibrary.wait || new WaitUtil(),
            support: PlaywrightLibrary.support || new SupportUtil(),
            api: PlaywrightLibrary.api || new APIUtil(),
            visual: PlaywrightLibrary.visual || new ApplitoolsUtil(),
        };

        return playwrightLibrary;
    }

    public playwrightDefaultProps(): IPlaywrightProjectProps {
        return {
            frameworkType: 'playwright',
            productName: 'qe',
            console: true,
            retries: 1,
            retriesCI: 1,
            maxWorkers: 10,
            maxWorkersCI: 10,
            runner: 'local',
            seleniumServerJar: '',
            logType: 'debug',
            envPropsPath: './config/env/',
            queryPropsPath: './tests/_queries/',
            testDataPath: './tests/_data/',
            baseObjectPath: './tests/_objects/',
            chartTemplate: './resources/chart/sampleChart.html',
            downloadsPath: './build/downloads/',
            connectionRetryCount: 1,
            connectionRetryTimeout: 100000,
            waitForTimeout: 3000,

            implicitWait: 3000,
            pageLoadWait: 20000,
            scriptWait: 6000,
            mochaTimeout: 90000,
            interval: 200, // used between attempts

            allure: {
                customPluginPath: '',
                disableMochaHooks: true,
                disableWebdriverStepsReporting: true,
                disableWebdriverScreenshotsReporting: false,
                addConsoleLogs: false,
                removeSkips: true,
            },

            dashboard: {
                assetTeam: null,
                appIDs: '',
                testPhrase: [''],
            },

            launchDarkly: {
                projectKey: '',
                apiKey: undefined,
            },

            qTest: {
                projectID: -1,
                token: undefined,
                suiteID: -1,
            },

            applitools: {
                enable: false,
                url: 'https://nabeyes.applitools.com',
                apiKey: '',
                applicationName: '',
                batchName: '',
                parentBranchName: '',
                branchName: '',
                concurrency: 20,
                sendDOM: true,
                verboseConsoleLogs: false,
                runnerType: 'grid',
                imageTesterJar: '',
                proxy: '',
                showLogs: true,
                matchTimeout: 18000,
                matchLevel: MatchLevel.Layout,
                screens: [],
            },
        };
    }
}

export type ScreenListItem = { width: number; height: number; name: BrowserType } | { deviceName: DeviceName; screenOrientation: ScreenOrientation };
