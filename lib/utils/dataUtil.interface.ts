import { ICoreLibrary } from '@core';

export interface IName {
    first: string;
    last: string;
}

export interface IDataUtil {

    initObjProps: (...propsPath: string[]) => void;
    initEnvProps: () => Map<string, any>;
    debug_PrintDataMaps: () => Promise<void>;
    initQueryProps: (fileName: string) => void;
    get: (valueKey: string | string[]) => Promise<any>;
    getName: () => Promise<IName>;
    getPhone: (spaces?: boolean) => Promise<string>;
    getInternationalPhone: (spaces?: boolean) => Promise<string>;
    getMobile: (spaces?: boolean) => Promise<string>;
    getEmail: (first: string | IName, last?: string) => Promise<string>;

    /**
     * Assumption of use is that selector is supplied as the key variable.
     * This allows the selector to be matched with the column header in the source data and then it will pick the key.
     * If a second variable is supplied and the selector/key value is not returned, the currentData option will be checked to see if its in the dataSet
     * If both are not in the dataSet then currentData value will be returned as a string
     * @param key the key of the object map for the csv value.
     * @param currentData - data or value
     */
    getTestData: (
        key: string | string[],
        currentData: string | undefined,
    ) => Promise<string | null>;

    has: (valueKey: string | string[]) => Promise<boolean>;
    setAllData: () => Map<string, Map<string, any>>;
    setData: (dataFile: string) => Map<string, any>;

    getCSVDataMAP: (
        dataFile: string,
        headerRow?: boolean,
    ) => Promise<Array<Map<any, any>>>;

    getCSVDataJSON: (dataFile: string, headerRow?: boolean) => Promise<any[]>;

    setTestData: (
        testName: string,
        iteration?: number,
        qe?: ICoreLibrary,
    ) => Promise<Map<string, any>>;

    getIterationRowsCount: (testName: string) => number;
    isDataType: (keyValue: string) => Promise<boolean>;

    convertJSONToCSV: (
        jsonData: any,
        removeHeader?: boolean,
    ) => Promise<string>;
}
