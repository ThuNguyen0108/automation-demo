import * as fs from 'fs';
import { CoreLibrary, CoreMaps } from '@core';
import { IFileUtil } from './fileUtil.interface';
import { ILogUtil } from './logUtil.interface';
import { ICoreTransactionUtil } from './transactionUtil.interface';
import path from 'path';

export class CoreTransactionUtil implements ICoreTransactionUtil {
    private get log(): ILogUtil {
        return CoreLibrary.log;
    }

    private get files(): IFileUtil {
        return CoreLibrary.files;
    }

    private get paths(): any {
        return CoreLibrary.paths;
    }

    private get process(): any {
        return CoreLibrary.process;
    }

    public async initSLA(sla: number): Promise<void> {
        await this.log.performance(
            `${await this.getDate()} | TXN SLA set as [${sla}]`,
        );
        CoreMaps._txn.set('sla', sla);
        CoreMaps._txn.set('log', `PERFORMANCE | ${await this.getDate()}`);
    }

    public async start(txnName: string, tempSLA?: number): Promise<void> {
        if (tempSLA !== undefined) {
            await this.tempSLA(txnName, tempSLA);
        }

        const cleanPath: any = this.paths.sanitizePath(this.paths.output);
        await this.files.addDirectory(`${cleanPath}uxTiming${path.sep}`);

        CoreMaps._txn.set(txnName, Date.now());

        await this.log.performance(
            `${await this.getDate()} | TXN start for [${txnName}]`,
        );
    }

    public async clear(): Promise<void> {
        CoreMaps._txn.clear();
    }

    public async end(
        txnName: string,
        outcome?: 'test' | 'debug',
    ): Promise<void> {
        const fileName = `uxTiming/uxTiming_${this.process.TEST_FILENAME}`;
        const cleanPath: string =
            this.paths.sanitizePath(this.paths.output) + fileName;

        const duration: number =
            Date.now() - CoreMaps._txn.get(txnName);

        let mySLA: number = CoreMaps._txn.get('sla');

        if (CoreMaps._txn.has(`${txnName}_tempSLA`)) {
            mySLA = CoreMaps._txn.get(`${txnName}_tempSLA`);
            CoreMaps._txn.delete(`${txnName}_tempSLA`);
        }

        let logMessage: any;

        if (!fs.existsSync(`${cleanPath}.csv`)) {
            logMessage = [
                'TXN_Date',
                'TXN_Time',
                'Test_Name',
                'TXN_Name',
                'TXN_Duration',
                'Expected_SLA',
                'SLA_Met',
            ].join(',') + '\n';
        }

        logMessage =
            `${(logMessage ? '' : logMessage) + (await this.getDate())},` +
            `${this.process.TEST_NAME},${txnName},${duration},${mySLA},` +
            `${duration <= mySLA}`;

        await this.log.performance(
            `${await this.getDate()} | TXN end for [${txnName}]`,
        );

        await this.files.addLogLine(fileName, logMessage, '.csv');

        if (outcome && outcome === 'test') {
            await this.log.result(duration <= mySLA, logMessage);
        } else {
            await this.log.performance(logMessage);
        }
    }

    public async getDate(): Promise<string> {
        return new Date().toLocaleString();
    }

    private async tempSLA(txnName: string, sla: number): Promise<void> {
        await this.log.performance(
            `${await this.getDate()} | TXN temporary SLA set as [${sla}]`,
        );
        CoreMaps._txn.set(`${txnName}_tempSLA`, sla);
    }
}
