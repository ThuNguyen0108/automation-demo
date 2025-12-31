import { QueryResult } from 'pg';

export interface IPostgresUtil {
    /**
     * Method to execute CRUD operations on PostgreSQL database. It returns QueryResult object upon successful execution.
     *
     * @param queryText - psql query
     * @param values - [optional] parameter to be used if passing values to query. For example:
     *
     * const insertQuery = 'INSERT INTO <table> ( column1, column2) VALUES ($1, $2)';
     * await qe.postgresDB.returnQueryResult(insertQuery, [val1, val2]);
     *
     * @param viaSSH - default value is false. Set it to true only if the connection is routing via jumpbox or bastion host
     * @returns
     */
    returnQueryResult: (
        queryText: string,
        values?: string[],
        viaSSH?: boolean,
    ) => Promise<QueryResult | undefined>;
}
