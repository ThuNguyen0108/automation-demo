import * as oracledb from 'oracledb';
import { CoreLibrary, CoreMaps } from '@core';
import { IDataUtil } from './dataUtil.interface';
import { ILogUtil } from './logUtil.interface';
import { IOracleUtil } from './oracleUtil.interface';

export class OracleUtil implements IOracleUtil {
    public client: boolean = false;

    private get log(): ILogUtil {
        return CoreLibrary.log;
    }

    private get data(): IDataUtil {
        return CoreLibrary.data;
    }

    public async returnQueryResult(
        queryString: string,
    ): Promise<oracledb.Result<any>> {
        let connection: oracledb.Connection | undefined;
        let queryResult: oracledb.Result<any>;

        try {
            await this.log.step('Attempting connection to the Oracle db');

            const oracleConfig = {
                connectString: CoreMaps._env.get('oracleConfig.connectString'),
                username: CoreMaps._env.get('oracleConfig.username'),
                password: CoreMaps._env.get('oracleConfig.password'),
            };

            connection = await oracledb.getConnection(oracleConfig);

            await this.log.step(`Attempting query on db with:\n${queryString}`);

            queryResult = await connection.execute(
                queryString,
                {},
                { autoCommit: true },
            );

            if (
                queryString.toUpperCase().includes('UPDATE ') &&
                queryResult.rowsAffected
            ) {
                await this.log.debug(
                    `Query updated ${queryResult.rowsAffected} records`,
                );
            }

            return queryResult;
        } catch (err: any) {
            const errMsg: any = err.message;

            if (
                errMsg.includes(
                    'ORA-12154: TNS:could not resolve the connect identifier specified',
                )
            ) {
                await this.log.fail( 
                    `Connection: ${err.toString()}`,
                );
            } else if (
                errMsg.includes('ORA-00904:') &&
                errMsg.includes('invalid identifier')
            ) {
                await this.log.fail(
                    `Query: ${err.toString()}`,
                );
            } else if (
                errMsg.includes('ORA-00942: table or view does not exist') ||
                errMsg.includes('ORA-00900: invalid SQL statement')
            ) {
                await this.log.fail(
                    `Query: ${err.toString()}\n Query was: ${queryString}`,
                );
            } else {
                await this.log.fail(
                    `DBUtil: ${err.toString()}\n PLEASE ADD THIS ERROR TYPE TO THE dbUtil.ts`,
                );
            }
        } finally {
            if (connection) {
                try {
                    await connection.close();
                    await this.log.step(
                        'returnQueryResult: Connection closed',
                    );
                } catch (err: any) {
                    await this.log.fail(
                        `returnQueryResult: Connection: ${err.toString()}`,
                    );
                }
            }
        }

        // handling the type error produced from not having a final return
        return {} as oracledb.Result<any>;
    }

    public async returnQueryMap(
        queryString: string,
    ): Promise<Map<any, any>> {
        const queryResult =
            await this.returnQueryResult(queryString);

        const resultMap = new Map();
        const { rows = [], metaData = [] } =
            queryResult as oracledb.Result<any>;

        rows.forEach((myRow: any, index: any): void => {
            const rowMap = new Map();

            if (Array.isArray(myRow)) {
                myRow.forEach((entry: any, i: number): void => {
                    rowMap.set(metaData[i].name, entry);
                });
            }

            resultMap.set(index, rowMap);
        });

        return resultMap;
    }

    public async getQueryResult(
        queryName: string,
        fileName: string,
        params: Array<string>,
    ): Promise<oracledb.Result<any>> {
        await this.data.initQueryProps(fileName);

        let sql: any = CoreMaps._dbQueries.get(queryName);

        if (Array.isArray(params) && params.length) {
            sql = await this.updateSql(sql, params);
        }

        return await this.returnQueryResult(sql);
    }

    private async updateSql(
        sql: string,
        params: Array<string>,
    ): Promise<string> {
        let output: string = sql;

        for (let i: number = 0; i < params.length; ++i) {
            output = output.replace('~', params[i].toString());
        }

        await this.log.debug(
            `Updated query from original:\n${sql}\nto:\n${output}\nusing params:\n${params}`,
        );

        return output;
    }
}
