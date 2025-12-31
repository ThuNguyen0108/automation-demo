import fs from 'node:fs';
import os from 'os';
import path from 'node:path';
import * as uuid from 'uuid';
import { CoreLibrary, RUNTYPE } from './coreLibrary';
import { ICoreLibrary } from './coreLibrary.interface';
import { CoreMaps } from './coreMaps';
import { DataUtil, FileUtil, LogUtil, CoreSupportUtil, CoreAPIUtil } from '@utils';
import { PathUtil } from '@utils';

export type configDetails = { path: string, file: string };
const instancesCore: Record<string, ICoreLibrary> = {};

export class CoreInstance {
    constructor() {
        if (CoreMaps._allData === undefined) new CoreMaps();
        
        // Initialize CoreLibrary static properties if not already initialized
        if (CoreLibrary.data === undefined) {
            CoreLibrary.data = new DataUtil();
        }
        if (CoreLibrary.files === undefined) {
            CoreLibrary.files = new FileUtil();
        }
        if (CoreLibrary.log === undefined) {
            CoreLibrary.log = new LogUtil();
        }
        if (CoreLibrary.support === undefined) {
            CoreLibrary.support = new CoreSupportUtil();
        }
        if (CoreLibrary.api === undefined) {
            CoreLibrary.api = new CoreAPIUtil();
        }
        
        // Initialize paths if not already set
        if (CoreLibrary.paths === undefined) {
            const pathUtil = new PathUtil();
            CoreLibrary.paths = {
                output: '',
                screenshots: '',
                diagnostics: '',
                recording: '',
                allure: '',
                charts: '',
                perfecto: '',
                test: '',
                sanitizePath: (segments: string[] | string): string => {
                    return pathUtil.sanitizePath(segments);
                },
                sanitizeDirectory: (segments: string[] | string): string => {
                    return pathUtil.sanitizeDirectory(segments);
                }
            };
        }
        
        // Initialize OS if not already set
        if (CoreLibrary.OS === undefined) {
            CoreLibrary.OS = {
                platform: os.platform(),
                release: os.release()
            };
        }
        
        // Initialize projectProps with default values if not already set
        if (CoreLibrary.projectProps === undefined) {
            const coreLib = new CoreLibrary();
            CoreLibrary.projectProps = coreLib.defaultCoreProjectProps;
        }
        
        CoreInstance.set(new CoreLibrary().getInstance());
    }

    static set(core: ICoreLibrary): ICoreLibrary {
        if(process.env.QE_CONFIG_ID === undefined) {
            throw new Error(`process.env.QE_CONFIG_ID is not set`);
        }
        if (instancesCore[process.env.QE_CONFIG_ID] === undefined) {
            instancesCore[process.env.QE_CONFIG_ID] = core;
            if (instancesCore[process.env.QE_CONFIG_ID] === undefined) {
                throw new Error(`Failed to set core instance for QE_CONFIG_ID: ${process.env.QE_CONFIG_ID}`);
            }
        }
        return instancesCore[process.env.QE_CONFIG_ID];
    }
    
    public static get get(): ICoreLibrary {
        if(process.env.QE_CONFIG_ID === undefined) {
            throw new Error(`process.env.QE_CONFIG_ID is not set`);
        }
        if(instancesCore[process.env.QE_CONFIG_ID] === undefined) {
            throw new Error(`Failed to get core instance for QE_CONFIG_ID: ${process.env.QE_CONFIG_ID}`);
        }
        return instancesCore[process.env.QE_CONFIG_ID];
    }
}

export function coreSetup(configID?: configDetails): string {
    if (process.env.QE_CONFIG_ID === undefined) {
        throw new Error(`process.env.QE_CONFIG_ID is not set`);
    }
    if (process.env.SESSION_UUID === undefined) process.env.SESSION_UUID = uuid.v4();
    doAuto();
    // Set default TARGET if not provided
    if (process.env.TARGET === undefined || process.env.TARGET === '') {
        process.env.TARGET = 'local';
    }
    if (process.env.QE_OUTPATH === undefined) {
        const outPath = path.join(process.cwd(), `.${path.sep}build${path.sep}logs${path.sep}${process.env.QE_CONFIG_ID}${path.sep}`);
        if(!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });
        process.env.QE_OUTPATH = outPath;
        process.env.DASHBOARD_FILE_NAME = path.resolve(`${outPath}${path.sep}dashboard_${process.env.SESSION_UUID}.json`);
    }
    if(process.env.RUNTYPE !== undefined) process.env.RUNTYPE = process.env.RUNTYPE.toLowerCase();
    if (process.env.RUNTYPE === undefined) process.env.RUNTYPE = RUNTYPE.BROWSER;
    new CoreInstance();
    const qe: ICoreLibrary = CoreInstance.get;
    qe.data.initEnvProps();
    qe.paths.output = qe.paths.sanitizePath(qe.paths.output!);
    qe.paths.allure = qe.paths.sanitizePath(qe.paths.allure!);
    qe.paths.recording = qe.paths.sanitizePath(qe.paths.recording!);
    // Set screenshots path relative to output path if not already set
    // Use QE_OUTPATH or paths.output as base directory
    if (!qe.paths.screenshots || qe.paths.screenshots === '' || qe.paths.screenshots === '.') {
        const basePath = process.env.QE_OUTPATH || qe.paths.output || path.join(process.cwd(), 'build', 'logs', process.env.QE_CONFIG_ID!);
        qe.paths.screenshots = path.join(basePath, 'screenshots') + path.sep;
    }
    qe.paths.screenshots = qe.paths.sanitizePath(qe.paths.screenshots!);
    qe.paths.charts = qe.paths.sanitizePath(qe.paths.charts!);
    qe.paths.diagnostics = qe.paths.sanitizePath(qe.paths.diagnostics!);
    qe.projectProps.downloadsPath = qe.projectProps.downloadsPath || `${qe.paths.output}downloads${path.sep}`;
    qe.projectProps.downloadsPath = qe.paths.sanitizePath(qe.projectProps.downloadsPath);
    if (process.env.LOG_CONSOLE !== undefined) {
        qe.projectProps.console = qe.support.toBool(process.env.LOG_CONSOLE);
    } else {
        process.env.LOG_CONSOLE = qe.projectProps.console !== undefined ? qe.projectProps.console.toString() : 'true';
    }

    let res1 = qe.files.createDirectory(qe.paths.allure);
    let res2 = qe.files.createDirectory(qe.paths.recording);
    let res3 = qe.files.createDirectory(qe.paths.screenshots);
    let res4 = qe.files.createDirectory(qe.paths.charts);
    let res5 = qe.files.createDirectory(qe.paths.diagnostics);
    let res6 = qe.files.createDirectory(qe.projectProps.downloadsPath);
    if (!(res1 && res2 && res3 && res4 && res5 && res6)) {
        throw new Error(`Failed to create Log directories for QE_CONFIG_ID: ${process.env.QE_CONFIG_ID}`);
    }
    return process.env.QE_CONFIG_ID;
   
}

export function doAuto(): void {
    if (fs.existsSync(`${os.homedir() + path.sep}.qe`)) {
        require('dotenv').config({ path: `${os.homedir() + path.sep}.qe`});
        process.stdout.write(`INFO | Users .qe file found and variables enabled.\n`);
    } else if (process.platform.startsWith('win') || process.platform.startsWith('darwin')) {
        process.stdout.write(`INFO | No .qe file found at ${os.homedir() + path.sep}\n`)
    }
}