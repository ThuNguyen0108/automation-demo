import {
    CreateTableInput,
    DeleteItemCommandInput,
    GetItemCommandInput,
    PutItemCommandInput,
    UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';

export interface IDynamoUtil {
    createTable: (input: CreateTableInput, tableName: string) => Promise<void>;
    deleteItemFromTable: (input: DeleteItemCommandInput) => Promise<void>;
    deleteTable: (tableName: string) => Promise<void>;
    getItemFromTable: (input: GetItemCommandInput) => Promise<void>;
    initialise: () => Promise<void>;
    listAllTables: () => Promise<string[]>;
    putItemInTable: (input: PutItemCommandInput) => Promise<void>;
    updateItemInTable: (input: UpdateItemCommandInput) => Promise<void>;
}
