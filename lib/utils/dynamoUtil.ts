import {
    CreateTableCommand,
    CreateTableInput,
    DeleteTableCommand,
    DynamoDBClient,
    DynamoDBClientConfig,
    ListTablesCommand,
    waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DeleteCommandInput,
    GetCommand,
    GetCommandInput,
    PutCommand,
    PutCommandInput,
    UpdateCommand,
    UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { CoreLibrary, CoreMaps } from '@core';
import { IDynamoUtil } from './dynamoUtil.interface';
import { ILogUtil } from './logUtil.interface';

let dynamoDB: DynamoDBClient;

export class DynamoUtil implements IDynamoUtil {
    private get log(): ILogUtil {
        return CoreLibrary.log;
    }

    public async initialise(): Promise<void> {
        try {
            if (!dynamoDB) dynamoDB = new DynamoDBClient(this.getConfig());
        } catch (err: any) {
            await this.log.fail(err.toString());
        }
    }

    public async createTable(
        input: CreateTableInput,
        tableName: string,
    ): Promise<void> {
        try {
            await this.initialise();
            await this.log.debug('Creating new table...');
            if (!(await this.listAllTables()).includes(tableName)) {
                const cmdCreate = new CreateTableCommand(input);
                const response = await dynamoDB.send(cmdCreate);

                await this.log.debug(`Table created. Waiting for the table to be 'Active'. TableStatus: [${response.TableDescription!.TableStatus}]`);

                const result = await waitUntilTableExists(
                    {
                        client: dynamoDB,
                        maxWaitTime: 10,
                        minDelay: 1,
                        maxDelay: 3,
                    },
                    { TableName: response.TableDescription!.TableName },
                );

                await this.log.result(
                    result.state === 'SUCCESS',
                    'Table should now be \'Active\'',
                );
            }
        } catch (err: any) {
            await this.log.fail(`Error creating table: ${err.toString()}`);
        }
    }

    public async listAllTables(): Promise<string[]> {
        try {
            await this.initialise();
            const cmdListTables = new ListTablesCommand({});
            const response = await dynamoDB.send(cmdListTables);
            return response.TableNames as string[];
        } catch (err: any) {
            await this.log.fail(`Error listing tables: ${err.toString()}`);
        }
        return [];
    }

    public async deleteTable(tableName: string): Promise<void> {
        try {
            await this.initialise();
            await this.log.debug('Deleting table...');
            if ((await this.listAllTables()).includes(tableName)) {
                const cmdDelete = new DeleteTableCommand({
                    TableName: tableName,
                });
                const response = await dynamoDB.send(cmdDelete);
                await this.log.result(
                    response.TableDescription!.TableStatus === 'ACTIVE',
                    `Table [${tableName}] should be deleted.`,
                );
            } else {
                await this.log.debug(`Could not find table [${tableName}] to delete!`);
            }
        } catch (err: any) {
            await this.log.fail(`Error deleting table: ${err.toString()}`);
        }
    }

    public async putItemInTable(input: PutCommandInput): Promise<void> {
        try {
            await this.initialise();
            await this.log.debug('Inserting data into table...');
            const cmdPut = new PutCommand(input);
            await dynamoDB.send(cmdPut);
            await this.log.pass('Item added into the table.');
        } catch (err: any) {
            await this.log.fail(`Error inserting data into table: ${err.toString()}`);
        }
    }

    public async getItemFromTable(input: GetCommandInput): Promise<void> {
        try {
            await this.initialise();
            await this.log.debug('Retrieving data from table...');
            const cmdGet = new GetCommand(input);
            const response = await dynamoDB.send(cmdGet);
            await this.log.pass(`Item retrieved from table: ${JSON.stringify(response.Item)}`);
        } catch (err: any) {
            await this.log.fail(`Error fetching data from table: ${err.toString()}`);
        }
    }

    public async updateItemInTable(
        input: UpdateCommandInput,
    ): Promise<void> {
        try {
            await this.initialise();
            await this.log.debug('Updating item in table...');
            const cmdUpdate = new UpdateCommand(input);
            const response = await dynamoDB.send(cmdUpdate);
            await this.log.pass(`Item updated: ${JSON.stringify(response)}`);
        } catch (err: any) {
            await this.log.fail(`Error updating data in table: ${err.toString()}`);
        }
    }

    public async deleteItemFromTable(
        input: DeleteCommandInput,
    ): Promise<void> {
        try {
            await this.initialise();
            await this.log.debug('Deleting item from table...');
            const cmdDeleteItem = new DeleteCommand(input);
            await dynamoDB.send(cmdDeleteItem);
            await this.log.debug('Item deleted');
        } catch (err: any) {
            await this.log.fail(`Error deleting item from table: ${err.toString()}`);
        }
    }

    private getConfig(): DynamoDBClientConfig {
        const config: DynamoDBClientConfig = {
            region: CoreMaps._env.get('dynamoConfig.region' ),
            endpoint: CoreMaps._env.get('dynamoConfig.endpoint' ),
            credentials: {
                accessKeyId: CoreMaps._env.get(
                    'dynamoConfig.accessKeyId',
                ),
                secretAccessKey: CoreMaps._env.get(
                    'dynamoConfig.secretAccessKey',
                ),
            },
        };
        return config;
    }
}
