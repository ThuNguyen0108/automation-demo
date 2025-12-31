import { FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Export the Setup method as the default export
export default async function (config: FullConfig): Promise<void> {
    await cleanOldResults();
}

async function cleanAllurePath(): Promise<string> {
    let reportsPath: string = `${path.resolve(process.env.QE_ALLURE_DIR!)}`;
    if (process.platform.toLowerCase().startsWith('win')) {
        return reportsPath.split('/').join('\\');
    }
    return reportsPath.split('\\').join('/');
}

async function cleanOldResults(): Promise<void> {
    const allurePath = `${await cleanAllurePath()}${path.sep}`;
    if (fs.existsSync(allurePath))
        fs.rmSync(allurePath, { recursive: true, force: true });

    if (fs.existsSync(process.env.QE_PLAYWRIGHT_DIR!))
        fs.rmSync(process.env.QE_PLAYWRIGHT_DIR!, {
            recursive: true,
            force: true,
        });
}
