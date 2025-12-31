import { Client, QueryResult } from 'pg';
import { CoreLibrary, CoreMaps } from '@core';
import { ILogUtil } from './logUtil.interface';
import { IPostgresUtil } from './postgresUtil.interface';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let pgClient: Client;

const stackTrace = {
    _typeErr: 'but expression is of type',
    _syntaxErr: 'syntax error',
    _existErr: 'does not exist',
    _keyErr: 'duplicate key',
};

export class PostgresUtil implements IPostgresUtil {
    private get log(): ILogUtil {
        return CoreLibrary.log;
    }

    public async returnQueryResult(
        queryText: string,
        values?: string[],
        viaSSH: boolean = false,
    ): Promise<QueryResult | undefined> {
        let result: QueryResult;

        try {
            await this.initPGConnection(viaSSH);

            await this.log.step(
                `Querying PostgreSQL database... [ ${queryText} ]`,
            );

            result = await pgClient.query(queryText, values);
            return result;
        } catch (err: any) {
            const msg: any = err.toString();

            if (msg.includes(stackTrace._typeErr)) {
                await this.log.fail(
                    'DATA TYPE MISMATCH :- Ensure the value being inserted is of same type as that of column.',
                );
            } else if (msg.includes(stackTrace._syntaxErr)) {
                await this.log.fail(
                    'INVALID QUERY :- Ensure the query is written per psql standards.',
                );
            } else if (msg.includes(stackTrace._keyErr)) {
                await this.log.fail(
                    'PRIMARY KEY VIOLATION :- Ensure the primary key value is unique.',
                );
            } else if (msg.includes(stackTrace._existErr)) {
                await this.log.fail(
                    'NOT FOUND :- Ensure the query OR table name is correct.',
                );
            } else {
                await this.log.fail(
                    `ERR :- ${err.toString()}`,
                );
            }
        } finally {
            await pgClient.end();
            await this.log.step('PostgreSQL connection closed!\n');

            if (viaSSH) {
                await this.closeSSH();
            }
        }
    }

    private async initPGConnection(viaSSH: boolean): Promise<void> {
        await this.log.step('Attempting PostgreSQL connection...');

        try {
            if (viaSSH) {
                await this.openSSH();
            }

            // Connect to PostgreSQL
            pgClient = new Client({
                user: CoreMaps._env.get('postgresConfig.username'),
                host: viaSSH ? 'localhost' : CoreMaps._env.get('postgresConfig.host' ),
                database: CoreMaps._env.get('postgresConfig.database'),
                password: CoreMaps._env.get('postgresConfig.password'),
                port: CoreMaps._env.get('postgresConfig.port'),
                ssl: viaSSH ? { rejectUnauthorized: false } : false,
            });

            await pgClient.connect();
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }

    public async activeSSH(): Promise<boolean> {
        const dbHost: any = CoreMaps._env.get('postgresConfig.host');
        const dbPort: any = CoreMaps._env.get('postgresConfig.port');

        try {
            await execAsync(
                `pgrep -f "ssh.*-L 5432:${dbHost}:${dbPort}"`,
            );
            return true;
        } catch (err) {
            return false;
        }
    }

    public async openSSH(): Promise<void> {
        const dbHost: any = CoreMaps._env.get('postgresConfig.host');
        const dbPort: any = CoreMaps._env.get('postgresConfig.port');
        const sshHost: any = CoreMaps._env.get('postgresConfig.ssh.host');
        const sshUser: any = CoreMaps._env.get('postgresConfig.ssh.username');
        const keyPath: any = CoreMaps._env.get('postgresConfig.ssh.privateKey');

        if (!(await this.activeSSH())) {
            await execAsync(`chmod 600 ${keyPath}`);
            await execAsync(
                `ssh -o StrictHostKeyChecking=no -i ${keyPath} -f -N -L 5432:${dbHost}:${dbPort} ${sshUser}@${sshHost}`,
            );
            await this.log.step('SSH tunnel established');
        }
    }

    public async closeSSH(): Promise<void> {
        try {
            const dbHost: any = CoreMaps._env.get('postgresConfig.host');
            const dbPort: any = CoreMaps._env.get('postgresConfig.port');

            if (await this.activeSSH()) {
                await execAsync(
                    `pkill -f "ssh.*-L 5432:${dbHost}:${dbPort}"`,
                );
                await this.log.step('SSH tunnel closed');
            }
        } catch (err: any) {
            await this.log.fail(
                `Error closing connection: ${err.toString()}`,
            );
        }
    }
}
