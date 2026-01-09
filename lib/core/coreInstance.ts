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
                storageStates: '',
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
    // DEBUG: Track execution order
    // Note: CoreLibrary.log may not be initialized yet, so we'll init it if needed
    if (!CoreLibrary.log) {
        CoreLibrary.log = new LogUtil();
    }
    
    // Use void to fire-and-forget async log calls (non-blocking)
    void CoreLibrary.log.debug(`[EXECUTION ORDER] Phase 3: coreSetup() started`);
    void CoreLibrary.log.debug(`[EXECUTION ORDER] QE_CONFIG_ID at coreSetup start: ${process.env.QE_CONFIG_ID || 'UNDEFINED'}`);
    
    if (process.env.QE_CONFIG_ID === undefined) {
        void CoreLibrary.log.err(`[EXECUTION ORDER] ERROR: QE_CONFIG_ID is not set in coreSetup()!`);
        throw new Error(`process.env.QE_CONFIG_ID is not set`);
    }
    
    void CoreLibrary.log.debug(`[EXECUTION ORDER] QE_CONFIG_ID is valid: ${process.env.QE_CONFIG_ID}`);
    
    if (process.env.SESSION_UUID === undefined) {
        process.env.SESSION_UUID = uuid.v4();
        void CoreLibrary.log.debug(`[EXECUTION ORDER] Generated SESSION_UUID: ${process.env.SESSION_UUID}`);
    }
    
    void CoreLibrary.log.debug(`[EXECUTION ORDER] Calling doAuto() in coreSetup()`);
    doAuto();
    void CoreLibrary.log.debug(`[EXECUTION ORDER] After doAuto() in coreSetup() - DATAKEY: ${process.env.DATAKEY || 'UNDEFINED'}`);
    // Set default TARGET if not provided
    if (process.env.TARGET === undefined || process.env.TARGET === '') {
        process.env.TARGET = 'local';
    }
    if (process.env.QE_OUTPATH === undefined) {
        // Nếu QE_OUTPATH chưa được set, mặc định dùng build/logs/{QE_CONFIG_ID}/ dưới project root
        const defaultOut = path.join(process.cwd(), 'build', 'logs', process.env.QE_CONFIG_ID!);
        if (!fs.existsSync(defaultOut)) {
            fs.mkdirSync(defaultOut, { recursive: true });
        }
        process.env.QE_OUTPATH = defaultOut + path.sep;
        process.env.DASHBOARD_FILE_NAME = path.resolve(`${process.env.QE_OUTPATH}dashboard_${process.env.SESSION_UUID}.json`);
    }

    if (process.env.RUNTYPE !== undefined) {
        process.env.RUNTYPE = process.env.RUNTYPE.toLowerCase();
    }
    if (process.env.RUNTYPE === undefined) {
        process.env.RUNTYPE = RUNTYPE.BROWSER;
    }

    new CoreInstance();
    const qe: ICoreLibrary = CoreInstance.get;
    qe.data.initEnvProps();

    // Đồng bộ hóa qe.paths.output với QE_OUTPATH (hoặc fallback build/logs/{QE_CONFIG_ID}/)
    const outputBase = process.env.QE_OUTPATH || path.join(process.cwd(), 'build', 'logs', process.env.QE_CONFIG_ID!);
    qe.paths.output = qe.paths.sanitizeDirectory(outputBase);
    qe.paths.allure = qe.paths.sanitizePath(qe.paths.allure!);
    qe.paths.recording = qe.paths.sanitizePath(qe.paths.recording!);
    qe.paths.charts = qe.paths.sanitizePath(qe.paths.charts!);
    qe.paths.diagnostics = qe.paths.sanitizePath(qe.paths.diagnostics!);
    // Set screenshots path relative to output path (build/logs/{QE_CONFIG_ID}/...) nếu chưa set
    if (!qe.paths.screenshots || qe.paths.screenshots === '' || qe.paths.screenshots === '.' || qe.paths.screenshots === './') {
        const basePath = qe.paths.output;
        qe.paths.screenshots = qe.paths.sanitizePath(path.join(basePath, 'screenshots') + path.sep);
    } else {
        qe.paths.screenshots = qe.paths.sanitizePath(qe.paths.screenshots!);
    }

    // Initialize storageStates path dưới qe.paths.output (build/logs/{QE_CONFIG_ID}/storageStates/)
    qe.paths.storageStates = qe.paths.sanitizePath(
        path.join(qe.paths.output, 'storageStates') + path.sep
    );

    // Downloads path mặc định cũng dùng qe.paths.output làm base
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
    let res7 = qe.files.createDirectory(qe.paths.storageStates);
    if (!(res1 && res2 && res3 && res4 && res5 && res6 && res7)) {
        void CoreLibrary.log.err(`[EXECUTION ORDER] ERROR: Failed to create Log directories for QE_CONFIG_ID: ${process.env.QE_CONFIG_ID}`);
        throw new Error(`Failed to create Log directories for QE_CONFIG_ID: ${process.env.QE_CONFIG_ID}`);
    }
    
    void CoreLibrary.log.debug(`[EXECUTION ORDER] All directories created successfully`);
    void CoreLibrary.log.debug(`[EXECUTION ORDER] Phase 3: coreSetup() completed - returning QE_CONFIG_ID: ${process.env.QE_CONFIG_ID}`);
    return process.env.QE_CONFIG_ID;
   
}

/**
 * Load environment variables from ~/.qe file (home directory)
 * Simple key=value format parser (no dotenv dependency needed)
 */
function loadQeFile(qeFilePath: string): void {
    try {
        const content = fs.readFileSync(qeFilePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        
        for (const line of lines) {
            // Skip empty lines and comments
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }
            
            // Parse key=value format
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex === -1) {
                continue; // Skip invalid lines
            }
            
            const key = trimmedLine.substring(0, equalIndex).trim();
            let value = trimmedLine.substring(equalIndex + 1).trim();
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            
            // Set environment variable (only if not already set)
            if (key && !process.env[key]) {
                process.env[key] = value;
            }
        }
    } catch (error: any) {
        // Silently ignore errors (file might not exist or be unreadable)
        // Don't throw - framework should continue even if .qe file is missing
    }
}

export function doAuto(): void {
    // Load from project root .qe file only
    // path.join() automatically handles OS-specific path separators (Windows: \, macOS/Linux: /)
    const projectQePath = path.join(process.cwd(), '.qe');
    if (fs.existsSync(projectQePath)) {
        loadQeFile(projectQePath);
        process.stdout.write(`INFO | Project .qe file found at ${projectQePath} and variables enabled.\n`);
    } else {
        // Log message and continue without .qe file (not required)
        // Framework works fine without .qe file - it's optional
        process.stdout.write(`INFO | No .qe file found at project root (${projectQePath}). Continuing without environment variables from .qe file.\n`);
    }
}