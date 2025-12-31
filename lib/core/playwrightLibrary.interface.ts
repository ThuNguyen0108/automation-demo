import { ICoreLibrary, ICoreProjectProps } from './coreLibrary.interface';
import {
    MatchLevel,
    BrowserType,
    DeviceName,
    ScreenOrientation,
} from '@applitools/eyes-playwright';

import {
    IAPIUtil,
    IApplitoolsUtil,
    IBrowserUtil,
    IDiagnosticsUtil,
    IMockRouteUtil,
    IScreenUtil,
    ISupportUtil,
    IUIUtil,
    IWaitUtils,
} from '@playwrightUtils';

// Create a new type that omits ICoreAPIUtil from ICoreLibrary
type ICoreLibraryWithoutAPI = Omit<ICoreLibrary, 'api'>;
export type IPlaywrightLibrary = ICoreLibraryWithoutAPI & IPlaywrightSpecific;

interface IPlaywrightSpecific {
    // ally: IAllyUtil;
    ui: IUIUtil;
    visual: IApplitoolsUtil;
    diagnostics: IDiagnosticsUtil;
    mockRoute: IMockRouteUtil;
    browser: IBrowserUtil;
    screen: IScreenUtil;
    wait: IWaitUtils;
    api: IAPIUtil;
    support: ISupportUtil;
    projectProps: IPlaywrightProjectProps;
}

export interface IPlaywrightProjectProps extends ICoreProjectProps {
    retries: number;
    retriesCI: number;
    runner: 'local' | undefined;
    seleniumServerJar?: string;
    maxWorkers: number;
    maxWorkersCI: number;
    logType: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
    mochaTimeout: number;
    allure: {
        addConsoleLogs: boolean;
        customPluginPath: string;
        disableMochaHooks: boolean;
        disableWebdriverScreenshotsReporting: boolean;
        disableWebdriverStepsReporting: boolean;
        removeSkips: boolean;
    };
    applitools: {
        enable: boolean;
        url: string;
        apiKey: string;
        applicationName: string;
        batchName: string;
        parentBranchName: string;
        branchName: string;
        concurrency: number;
        sendDOM: boolean;
        verboseConsoleLogs: boolean;
        runnerType: 'grid' | 'classic';
        imageTesterJar: string;
        proxy: undefined | string;
        showLogs: boolean;
        matchTimeout: number;
        matchLevel: MatchLevel;
        screens: Array<ScreenListItemPlaywright>;
    };
}

export type ScreenListItemPlaywright = { width: number; height: number; name: BrowserType } | { deviceName: DeviceName; screenOrientation: ScreenOrientation };
