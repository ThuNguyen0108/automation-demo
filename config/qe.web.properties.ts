import { IPlaywrightProjectProps } from '@core';
import { MatchLevel } from '@applitools/eyes-playwright';
import * as os from 'node:os';

const ProjectProps: IPlaywrightProjectProps = {
    frameworkType: 'playwright',
    productName: 'speedydd-automation',
    retries: 1,
    retriesCI: 1,
    console: true,
    envPropsPath: './config/env/',
    queryPropsPath: './tests/_queries/',
    testDataPath: './tests/_data/',
    baseObjectPath: './tests/_objects/',
    chartTemplate: './resources/chart/sampleChart.html',
    downloadsPath: './build/downloads/',
    runner: 'local',

    maxWorkers: Math.max(...[2, os.cpus().length - 1]), // number of configured tests to run consecutively
    maxWorkersCI: Math.max(...[2, Math.floor(os.cpus().length / 2)]), // number of configured tests to run consecutively

    connectionRetryCount: 1,
    logType: 'trace', // Level of logging verbosity : trace | debug | info | warn | error | silent
    waitForTimeout: 3000,
    connectionRetryTimeout: 100000,
    implicitWait: 0,
    pageLoadWait: 90000,
    scriptWait: 6000,
    mochaTimeout: 190000,
    interval: 200, // used between attempts

    dashboard: {
        assetTeam: 'Speedydd',
        appIDs: 'SpeedyddAutomation',
        testPhrase: ['E2E'],
    },

    allure: {
        customPluginPath: './resources/customAllure/',
        disableMochaHooks: true,
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: false,
        addConsoleLogs: false,
        removeSkips: true,
    },

    qTest: {
        projectID: -1,
        token: process.env.QE_QTEST_TOKEN!,
        suiteID: -1,
    },

    launchDarkly: {
        projectKey: 'nab-x',
        apiKey: process.env.QE_LAUNCHDARKLY_TOKEN!,
    },

    applitools: {
        apiKey: '',
        applicationName: '',
        batchName: '',
        branchName: '',
        concurrency: 0,
        enable: false,
        imageTesterJar: '',
        matchLevel: MatchLevel.Layout,
        matchTimeout: 0,
        parentBranchName: '',
        proxy: '',
        runnerType: 'grid',
        screens: [],
        sendDOM: false,
        showLogs: false,
        url: '',
        verboseConsoleLogs: false,
    },
};

export default ProjectProps;
