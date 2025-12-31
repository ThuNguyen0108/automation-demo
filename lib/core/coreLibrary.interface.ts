import { GetCurrentMap } from "./coreMaps";

export interface ICoreLibrary {
    allData: Map<string, Map<string, any>>;
    dbQueries: Map<string, any>;
    envProps: GetCurrentMap;
    objProps: GetCurrentMap;
    testData: Map<string, any>;
    txnMap: Map<string, any>;
    api: ICoreAPIUtil;
    confluence: IConfluenceUtil;
    darkly: ILaunchDarklyUtil;
    data: IDataUtil;
    files: IFileUtil;
    db: {
        dynamo: IDynamoDBUtil;
        oracle: IOracleUtil;
        postgres: IPostgresUtil;
    }
    OS: { platform: string; release: string };
    projectProps: ICoreProjectProps;
    qTest: IQTestUtil;
    log: ILogUtil;
    support: ICoreSupportUtil;
    txn: ICoreTransactionUtil;
    tvt: ITVUtil;
    process: {
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
        TVT_SERVICE_NAME: string;
        TVT_PRODUCT_NAME: string;
        TVT_SUPPORT_LINK: string;
        SUSPEND_SCREENSHOTS: boolean;
        SESSION_IDS: string[];
    };
    paths: {
        output: string;
        screenshots: string;
        diagnostics: string;
        recording: string;
        allure: string;
        charts: string;
        perfecto: string;
        test: string;
        sanitizePath(segments: string[] | string): string;
        sanitizeDirectory(segments: string[] | string): string;
    };
}

export interface ICoreProjectProps {
    frameworkType: 'playwright' | 'wdio' ;
    productName: string;
    dashboard: {
        assetTeam?: string | null;
        appIDs: string | string[];
        testPhrase?: string[] | null;
    };
    console: boolean;
    envPropsPath: string;
    queryPropsPath: string;
    testDataPath: string;
    downloadsPath: string;
    chartTemplate: string;
    baseObjectPath: string;
    waitForTimeout: number;
    connectionRetryTimeout: number;
    connectionRetryCount: number;
    implicitWait: number;
    pageLoadWait: number;
    scriptWait: number;
    interval: number;
    launchDarkly: {
        projectKey: string;
        apiKey: string | undefined;
    }
    qTest: {
        projectID: number;
        token: string | undefined;
        suiteID: number;
    }
}