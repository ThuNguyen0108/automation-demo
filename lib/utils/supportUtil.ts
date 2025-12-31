import CryptoJS from 'crypto-js';
import { execSync } from 'node:child_process';
import type { DecryptionResult, ICoreSupportUtil } from '.';
import { CoreLibrary, CoreMaps, ICoreProjectProps } from '@core';
const simpleGit: any = require('simple-git');

export const DATE = {
    timeFormat: 'HH:mm:ss',
    dateTimeFormatDash: 'DD-MM-YYYY HH:mm:ss',
    dateTimeFormatSlash: 'DD/MM/YYYY HH:mm:ss',
    dateTimeFormatDashReverseDate: 'YYYY-MM-DD HH:mm:ss',
    dateTimeFormatSlashReverseDate: 'YYYY/MM/DD HH:mm:ss',
    dateFormatDash: 'DD-MM-YYYY',
    dateFormatSlash: 'DD/MM/YYYY',
    dateFormatDashReverseDate: 'YYYY-MM-DD',
    dateFormatSlashReverseDate: 'YYYY/MM/DD',
};

export class CoreSupportUtil implements ICoreSupportUtil {
    private get props(): ICoreProjectProps {
        return CoreLibrary.projectProps;
    }

    private get CoreMaps(): CoreMaps {
        return CoreMaps;
    }

    private get process(): any {
        return CoreLibrary.process;
    }

    public toBool(value: string | boolean | number): boolean {
        switch (String(value).toLowerCase().trim()) {
            case 'true':
            case 'yes':
            case '1':
            case 'on':
                return true;

            case 'false':
            case 'no':
            case '0':
            case 'off':
            case null:
                return false;

            default:
                return typeof value === 'string' ? false : Boolean(value);
        }
    }

    public getOS(): string {
        switch (process.platform) {
            case 'darwin':
                return 'MAC';
            case 'win32':
                return 'WINDOWS';
            case 'linux':
                return 'LINUX';
            default:
                return process.platform;
        }
    }

    public isBrowser(): boolean {
        return this.process.BROWSER !== undefined;
    }

    public isDevice(): boolean {
        return this.process.DEVICE !== undefined;
    }

    public isAppium(): boolean {
        return this.process.RUNTYPE === 'appium';
    }

    public isPerfecto(): boolean {
        return this.process.RUNTYPE === 'perfecto';
    }

    public isWDIO(): boolean {
        return this.props.frameworkType === 'wdio';
    }

    public isPlaywright(): boolean {
        return this.props.frameworkType === 'playwright';
    }

    // public isJest(): boolean {
    //     return this.props.frameworkType === 'jest';
    // }
    //
    // public isCypress(): boolean {
    //     return this.props.frameworkType === 'cypress';
    // }

    public isWin(): boolean {
        return this.getOS() === 'WINDOWS';
    }

    public async getGitUrl(): Promise<string> {
        return await execSync('git config --get remote.origin.url')
            .toString()
            .trim();
    }

    public isLinux(): boolean {
        return this.getOS() === 'LINUX';
    }

    public isMac(): boolean {
        return this.getOS() === 'MAC';
    }

    public isNull(obj: any): boolean {
        return undefined === obj || obj === null;
    }

    public isNumber(checkThis: any): Boolean {
        return !isNaN(Number(checkThis));
    }

    public randomString(length: number): string {
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        let result: string = '';

        for (let i: number = 0; i < length; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * characters.length),
            );
        }

        return result;
    }

    public splitMulti(str: string, tokens: string[]): string[] {
        const tempChar: string = tokens[0]; // We can use the first token as a temporary join character

        for (let i: number = 1; i < tokens.length; i++) {
            str = str.split(tokens[i]).join(tempChar);
        }

        return str.split(tempChar);
    }

    public async getAllFunctions(toCheck: any): Promise<string[]> {
        const props: any[] = [];
        let obj: any = toCheck;

        do {
            props.push(...Object.getOwnPropertyNames(obj));
        } while ((obj = Object.getPrototypeOf(obj)));

        return props
            .sort()
            .filter((e: string, i: number, arr: string[]): true | undefined => {
                if (e !== arr[i + 1] && typeof toCheck[e] === 'function')
                    return true;
            });
    }

    /**
     * Returns a string without special characters and all spaces replaced with -
     * Example usage: This allows for clean file path creation without improper path characters
     * @param cleanThis
     */
    public cleanString(stringToClean: string): string {
        return stringToClean
            .replace(/\s+/g, '-')
            .replace(/[^0-9a-z\-]/gi, '-')
            .replace(/-+/g, '-');
    }

    async encryptString(value: string, password: string): Promise<string> {
        return CryptoJS.AES.encrypt(value, password).toString();
    }

    async decryptString(
        encrypted: string,
        password: string,
    ): Promise<DecryptionResult> {
        try {
            const decrypted = CryptoJS.AES.decrypt(encrypted, password);
            const result: string = decrypted.toString(CryptoJS.enc.Utf8);

            if (!result) {
                return { success: false, error: 'Decryption failed' };
            }

            return { success: true, data: result };
        } catch (err) {
            return { success: false, error: 'Decryption failed' };
        }
    }

    public async getGitBranchName(): Promise<string> {
        const git: any = simpleGit(process.cwd());
        const status: any = await git.status();
        const branch: any = status.current;
        return branch;
    }
}
