import * as os from 'os';
import { CoreMaps, GetCurrentMap } from "./coreMaps";
import { ICoreLibrary, ICoreProjectProps } from "./coreLibrary.interface";
import {
    ICoreAPIUtil,
    IConfluenceUtil,
    ILaunchDarklyUtil,
    IDataUtil,
    IFileUtil,
    IQTestUtil,
    ILogUtil,
    ICoreSupportUtil,
    ICoreTransactionUtil,
    ITVTUtil,
    IDynamoUtil,
    IOracleUtil,
    IPostgresUtil
} from '@utils';

export enum RUNTYPE {
    DESKTOP = 'desktop',
    APPIUM = 'appium',
    PERFECTO = 'perfecto',
    GRID = 'grid',
    BROWSER = 'browser',
}

export interface UserOverrides {
    projectProps: any;
    deviceConfig?: any;
    perfectoBrowsers?: any;
    runtype?: RUNTYPE;
    tags?: RegExp | string;
}

export class CoreLibrary {
    public static _allData: Map<string, Map<string, any>>;
    public static _testData: Map<string, any>;
    public static _obj: GetCurrentMap;
    public static _env: GetCurrentMap;
    public static _dbQueries: Map<string, any>;
    public static _txn: Map<string, any>;
    public static api: ICoreAPIUtil;
    public static confluence: IConfluenceUtil;
    public static darkly: ILaunchDarklyUtil;
    public static data: IDataUtil;
    // public static diff: IFileDifUtil;
    public static files: IFileUtil;
    static projectProps: ICoreProjectProps;
    static qTest: IQTestUtil;
    public static log: ILogUtil;
    static support: ICoreSupportUtil;
    private static txn: ICoreTransactionUtil;
    static tvt: ITVTUtil;
    private static db: {
        dynamo: IDynamoUtil;
        oracle: IOracleUtil;
        postgres: IPostgresUtil;
    }
    public static OS: { platform: string; release: string };
    public static process: {
        BROWSER: string;
        PERFECTO_BROWSER: string;
        BUILD_NUMBER: string;
        DATAKEY: string;
        DEVICE: string;
        REPORTING: string;
        RUNTYPE: string;
        TARGET: string;
        ALLURE_CUSTOM: string;
        TEST_FILENAME: string;
        TEST_FILEPATH: string;
        TEST_NAME: string;
        EXECUTION_ID: string;
        TVT_SERVICE_NAME: string;
        TVT_PRODUCT_NAME: string;
        TVT_SUPPORT_LINK: string;
        SUSPEND_SCREENSHOTS: boolean;
        SESSION_IDS: string[];
    };

    public static paths: {
        output: string;
        screenshots: string;
        diagnostics: string;
        recording: string;
        allure: string;
        charts: string;
        perfecto: string;
        test: string;
        storageStates: string;
        sanitizePath(segments: string[] | string): string;
        sanitizeDirectory(segments: string[] | string): string;
    };

    constructor() {
        CoreLibrary.process = {
            BROWSER: this.cleanProceessVars(process.env.BROWSER, false) || '',
            PERFECTO_BROWSER: this.cleanProceessVars(process.env.BROWSER, null) || '',
            BUILD_NUMBER: this.cleanProceessVars(process.env.BUILD_NUMBER, null) || '',
            DATAKEY: this.cleanProceessVars(process.env.DATAKEY, null) || '',
            DEVICE: this.cleanProceessVars(process.env.DEVICE, null) || '',
            REPORTING: this.cleanProceessVars(process.env.REPORTING, true) || '',
            RUNTYPE: this.cleanProceessVars(process.env.RUNTYPE, false) || '',
            TARGET: this.cleanProceessVars(process.env.TARGET, null) || '',
            ALLURE_CUSTOM: '',
            TEST_FILENAME: '',
            TEST_FILEPATH: '',
            TEST_NAME: '',
            EXECUTION_ID: '',
            TVT_SERVICE_NAME: this.cleanProceessVars(process.env.TVT_SERVICE_NAME, null) || 'not specified',
            TVT_PRODUCT_NAME: this.cleanProceessVars(process.env.TVT_PRODUCT_NAME, null) || 'not specified',
            TVT_SUPPORT_LINK: process.env.TVT_SUPPORT_LINK || 'not specified',
            SUSPEND_SCREENSHOTS: false,
            SESSION_IDS: [],
        }
    }

    getInstance(): ICoreLibrary {
        return {
            //Maps
            allData: CoreLibrary._allData,
            testData: CoreLibrary._testData,
            dbQueries: CoreLibrary._dbQueries,
            envProps: CoreLibrary._env,
            objProps: CoreLibrary._obj,
            txnMap: CoreLibrary._txn,

            //props
            projectProps: CoreLibrary.projectProps,
            process: CoreLibrary.process,
            paths: CoreLibrary.paths,

            //utils
            api: CoreLibrary.api,
            confluence: CoreLibrary.confluence,
            darkly: CoreLibrary.darkly,
            data: CoreLibrary.data,
            files: CoreLibrary.files,
            db: CoreLibrary.db,
            OS: CoreLibrary.OS,
            qTest: CoreLibrary.qTest,
            log: CoreLibrary.log,
            support: CoreLibrary.support,
            txn: CoreLibrary.txn,
            tvt: CoreLibrary.tvt,
        }
    }

    private cleanProceessVars(v: string | undefined, upper: boolean | null): string | undefined {
        if (v !== undefined) {
            if (upper === null) return v.trim();
            return upper ? v.trim().toUpperCase() : v.trim().toLowerCase();
        }
        return undefined;
    }

    private getPlatform() {
        let type = os.platform().toString();
        if (os.type().toLowerCase() === 'darwin') type = 'MacOS';
        if (os.type().toLowerCase().startsWith('win')) type = 'Windows';
        return type;
    }

    defaultCoreProjectProps: ICoreProjectProps = {
        frameworkType: 'wdio',
        productName: 'automation',
        console: true,
        envPropsPath: './config/env/',
        queryPropsPath: './tests/_queries/',
        testDataPath: './tests/_data/',
        baseObjectPath: './tests/_objects/',
        chartTemplate: './resources/chart/sampleChart.html',
        downloadsPath: './build/downloads/',
        connectionRetryCount: 3,
        waitForTimeout: 1000,
        connectionRetryTimeout: 10000,
        implicitWait: 3000,
        pageLoadWait: 20000,
        scriptWait: 6000,
        interval: 500,
        launchDarkly: {
            projectKey: '',
            apiKey: undefined,

        },
        qTest: {
            projectID: -1,
            token: undefined,
            suiteID: -1,
        },
        dashboard: {
            assetTeam: null,
            appIDs: [''],
            testPhrase: null
        }
    }
}




