import { FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { doAuto } from './coreInstance';
import { CoreLibrary } from './coreLibrary';
import { LogUtil } from '@utils';

// Helper to ensure log is available (init early if needed)
function getLog() {
    if (!CoreLibrary.log) {
        CoreLibrary.log = new LogUtil();
    }
    return CoreLibrary.log;
}

// Export the Setup method as the default export
export default async function (config: FullConfig): Promise<void> {
    const log = getLog();
    
    // DEBUG: Track execution order
    await log.debug('[EXECUTION ORDER] Phase 2: globalSetup started');
    await log.debug(`[EXECUTION ORDER] QE_CONFIG_ID at globalSetup start: ${process.env.QE_CONFIG_ID || 'UNDEFINED'}`);
    await log.debug(`[EXECUTION ORDER] QE_ALLURE_DIR at globalSetup start: ${process.env.QE_ALLURE_DIR || 'UNDEFINED'}`);
    await log.debug(`[EXECUTION ORDER] QE_PLAYWRIGHT_DIR at globalSetup start: ${process.env.QE_PLAYWRIGHT_DIR || 'UNDEFINED'}`);
    
    // Load .qe file early (before coreSetup)
    // This ensures DATAKEY and other env vars are available
    await log.debug('[EXECUTION ORDER] Calling doAuto() to load .qe file');
    doAuto();
    await log.debug(`[EXECUTION ORDER] After doAuto() - QE_CONFIG_ID: ${process.env.QE_CONFIG_ID || 'UNDEFINED'}`);
    await log.debug(`[EXECUTION ORDER] After doAuto() - DATAKEY: ${process.env.DATAKEY || 'UNDEFINED'}`);
    
    await log.debug('[EXECUTION ORDER] Calling cleanOldResults()');
    await cleanOldResults();
    await log.debug('[EXECUTION ORDER] Phase 2: globalSetup completed');
}

async function cleanAllurePath(): Promise<string> {
    let reportsPath: string = `${path.resolve(process.env.QE_ALLURE_DIR!)}`;
    if (process.platform.toLowerCase().startsWith('win')) {
        return reportsPath.split('/').join('\\');
    }
    return reportsPath.split('\\').join('/');
}

async function cleanOldResults(): Promise<void> {
    const log = getLog();
    
    try {
        await log.debug('[CLEANUP] Starting cleanOldResults()');
        
        if (!process.env.QE_ALLURE_DIR) {
            await log.warning('[CLEANUP] QE_ALLURE_DIR is not set, skipping allure cleanup');
        } else {
    const allurePath = `${await cleanAllurePath()}${path.sep}`;
            await log.debug(`[CLEANUP] Allure path: ${allurePath}`);
            if (fs.existsSync(allurePath)) {
        fs.rmSync(allurePath, { recursive: true, force: true });
                await log.debug('[CLEANUP] Allure results cleaned');
            } else {
                await log.debug('[CLEANUP] Allure path does not exist, skipping');
            }
        }

        if (!process.env.QE_PLAYWRIGHT_DIR) {
            await log.warning('[CLEANUP] QE_PLAYWRIGHT_DIR is not set, skipping playwright cleanup');
        } else {
            await log.debug(`[CLEANUP] Playwright dir: ${process.env.QE_PLAYWRIGHT_DIR}`);
            if (fs.existsSync(process.env.QE_PLAYWRIGHT_DIR)) {
        fs.rmSync(process.env.QE_PLAYWRIGHT_DIR!, {
            recursive: true,
            force: true,
        });
                await log.debug('[CLEANUP] Playwright results cleaned');
            } else {
                await log.debug('[CLEANUP] Playwright dir does not exist, skipping');
            }
        }
        
        await log.debug('[CLEANUP] cleanOldResults() completed');
    } catch (error: any) {
        await log.err(`[CLEANUP] Error in cleanOldResults(): ${error.message}`);
        throw error;
    }
}
