import { sharedConfig, PROJECT_CONFIGS } from '@core';
import {defineConfig} from '@playwright/test';
import merge from 'lodash.merge';
import path from 'path';
import ProjectProps from './qe.web.properties';

const config = defineConfig(
    merge(
        sharedConfig({
            projectProps: ProjectProps,
            tags: /@UI|@BE|@INSPECT/,
        }),
        {
            // Enable hooks for automatic cleanup and report generation
            // Use relative paths from config file to hooks
            globalSetup: path.resolve(__dirname, '../lib/core/playwrightHooks.setup.ts'),
            globalTeardown: path.resolve(__dirname, '../lib/core/playwrightHooks.teardown.ts'),
            
            retries: 0,
            workers: 1,
            timeout: 120000,
            navigationTimeout: 60000,
            testDir: path.resolve(__dirname, '../tests'),
            testMatch: '**/*.spec.ts',
            testIgnore: ['**/pages/**', '**/_data/**', '**/_objects/**'],
            use: {
                // Handle dialogs automatically (auto-dismiss alerts, confirms, prompts)
                actionTimeout: 30000,
                permissions: [],
            },
            projects: [
                {
                    ...PROJECT_CONFIGS.browser.edge(),
                },
                {
                    name: 'BackEnd',
                    grep: /@BE/,
                },
            ],
        },
    ),
);

export default config;
