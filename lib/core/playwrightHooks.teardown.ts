import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { FullConfig } from '@playwright/test';
import process from 'node:process';

export default async function (config: FullConfig): Promise<void> {
    // Check if results directory exists
    const resultsPath = `${process.env.QE_ALLURE_DIR}results`;
    if (!fs.existsSync(resultsPath)) {
        process.stdout.write('No Allure results directory found\n');
        return;
    }

    // Check if there are any results
    const results = await fs.readdirSync(resultsPath);
    if (results.length === 0) {
        process.stdout.write('No test results to create Allure report\n');
        return;
    }

    // Generate Allure report
    try {
        await generateAllure();
        process.stdout.write('✓ Allure report generated successfully\n');
    } catch (error: any) {
        // Graceful error handling - don't fail the test run
        process.stdout.write(`⚠ Warning: Could not generate Allure report: ${error.message}\n`);
        process.stdout.write('  Tip: Install Java to generate Allure reports\n');
        process.stdout.write('  Alternative: Use Playwright HTML report (npm run report)\n');
    }
}

/**
 * Detect Java installation and set JAVA_HOME if needed
 */
function detectJavaHome(): string | null {
    // Check if JAVA_HOME is already set and valid
    const currentJavaHome = process.env.JAVA_HOME;
    if (currentJavaHome && fs.existsSync(currentJavaHome)) {
        const javaExe = process.platform === 'win32' 
            ? path.join(currentJavaHome, 'bin', 'java.exe')
            : path.join(currentJavaHome, 'bin', 'java');
        if (fs.existsSync(javaExe)) {
            return currentJavaHome;
        }
    }

    // Try to find Java installation (Windows paths)
    if (process.platform === 'win32') {
        const possiblePaths = [
            'C:\\Program Files\\Java\\jdk-11',
            'C:\\Program Files\\Java\\jdk-17',
            'C:\\Program Files\\Java\\jdk-21',
            'C:\\Program Files\\Eclipse Adoptium\\jdk-11.0.27.6-hotspot',
            'C:\\Program Files\\Eclipse Adoptium\\jdk-17',
            'C:\\Program Files\\Eclipse Adoptium\\jdk-21',
        ];

        for (const javaPath of possiblePaths) {
            const javaExe = path.join(javaPath, 'bin', 'java.exe');
            if (fs.existsSync(javaPath) && fs.existsSync(javaExe)) {
                process.env.JAVA_HOME = javaPath;
                return javaPath;
            }
        }
    }

    // Try to find from java command
    try {
        const javaVersionOutput = execSync('java -XshowSettings:properties -version 2>&1', {
            encoding: 'utf-8',
            stdio: 'pipe',
        });
        const javaHomeMatch = javaVersionOutput.match(/java\.home\s*=\s*(.+)/);
        if (javaHomeMatch && javaHomeMatch[1]) {
            const detectedHome = javaHomeMatch[1].trim();
            if (fs.existsSync(detectedHome)) {
                process.env.JAVA_HOME = detectedHome;
                return detectedHome;
            }
        }
    } catch (err) {
        // Java command not found
    }

    return null;
}

async function generateAllure(): Promise<void> {
    const reportsPath: string = process.env.QE_ALLURE_DIR!;

    // Detect Java before attempting to generate report
    const javaHome = detectJavaHome();
    if (!javaHome) {
        throw new Error('Java not found. Allure requires Java to generate reports.');
    }

    try {
        // Generate interactive report (requires Java server to view)
        execSync(
            `npx allure generate ${reportsPath}results --clean -o ${reportsPath}report`,
            { stdio: 'inherit' },
        );

        // Generate unified HTML report (single file, no server needed)
        execSync(
            `npx allure generate ${reportsPath}results --clean --single-file -o ${reportsPath}unified`,
            { stdio: 'inherit' },
        );

        // Copy unified report to root of allure directory
        fs.copyFileSync(
            `${reportsPath}unified${path.sep}index.html`,
            `${reportsPath}unified_report.html`,
        );

        // Clean up temporary unified directory
        fs.rmSync(`${reportsPath}unified`, {
            recursive: true,
            force: true,
        });
    } catch (err: any) {
        console.error(
            '::: Generating Allure report:',
            reportsPath,
            err.stack !== undefined ? err.stack : err.message,
        );
        throw err; // Re-throw to let caller handle gracefully
    }
}
