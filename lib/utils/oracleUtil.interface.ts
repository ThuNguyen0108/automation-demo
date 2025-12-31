import * as oracledb from 'oracledb';

export interface IOracleUtil {
    getQueryResult: (
        queryName: string,
        fileName: string,
        params: Array<string>,
    ) => Promise<oracledb.Result<any>>;

    returnQueryMap: (queryString: string) => Promise<Map<any, any>>;

    returnQueryResult: (queryString: string) => Promise<oracledb.Result<any>>;

    client: boolean;
}
