import { merge } from 'lodash';
import { parse, unparse } from 'papaparse';
import path from 'node:path';
import PropertiesReader from 'properties-reader';
import { FileUtil, IDataUtil, IFileUtil, ILogUtil } from './index';
import {
  CoreLibrary,
  CoreMaps,
  ICoreLibrary,
  ICoreProjectProps,
} from '@core';
import { IName } from './dataUtil.interface';
import names from './provider/2000_random_names.json';
import DataProviderFactory, { DataType } from './provider/DataProviderFactory';

export class DataUtil implements IDataUtil {

  private get log(): ILogUtil {
    return CoreLibrary.log;
  }

  private get files(): IFileUtil {
    if (CoreLibrary.files === undefined) return new FileUtil();
    return CoreLibrary.files;
  }

  private get props(): ICoreProjectProps {
    return CoreLibrary.projectProps;
  }

  private get process(): any {
    return CoreLibrary.process;
  }

  private get paths(): any {
    return CoreLibrary.paths;
  }

  public setAllData(): Map<string, Map<string, any>> {
    let allData: Map<string, Map<string, any>> = new Map();
    const cleanPath: string = path.join(
      process.cwd(),
      this.paths.sanitizeDirectory(this.props.testDataPath),
    );

    const dataFiles: string[] = this.files.getAllFilePaths(cleanPath, 'csv');
    for (const dataFile of dataFiles) {
      allData = new Map([...allData, ...this.setData(dataFile)]);
    }

    CoreMaps._allData = allData;
    return allData;
  }

  public setData(dataFile: string): Map<string, any> {
    const csvFile: string = (this.files.getFileContent(dataFile))!
      .replace(/\r/g, '\n')
      .replace(/\n+/g, '\n')
      .trim();

    const fileName: string = this.files.getFileNameFromPath(dataFile, false);
    const csvRows: string[] = csvFile.replace('\r', '\n').split('\n');
    const subMap = new Map(CoreMaps._allData || []);
    let keys: any[] = [];

    csvRows.forEach((entry: string, iter: number): void => {
      if (iter < 1) {
        keys = entry.split(',').map((item: string): string => item.trim());
        keys = keys.slice(2, keys.length);
        return;
      }

      if (entry.trim().length > 0) {
        const columns: string[] = entry
          .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g)
          .map((item: string): string => item.trim());

        if (
          process.env.DATAKEY!.trim() ===
          columns.slice(1, 2).toString().trim()
        ) {
          const index = `${fileName}[${iter}].${columns
            .slice(0, 2)
            .join('.')}`;

          const dataSet = new Map();
          const values: string[] = columns.slice(2, columns.length);

          keys.forEach((key: any, i: number): void => {
            values[i] =
              values[i].startsWith('"') && values[i].endsWith('"')
                ? values[i].slice(1, -1)
                : values[i];

            dataSet.set(key, values[i]);
          });

          subMap.set(index, dataSet);
        }
      }
    });

    return subMap;
  }

  public async setTestData(
    testName: string,
    iteration?: number,
    qe?: ICoreLibrary,
  ): Promise<Map<string, any>> {
    if (CoreMaps._allData.size === 0) this.setAllData();

    const dataKey = `${testName.trim()}.${this.process.DATAKEY!.trim()}`;
    let iter: number = 0;

    for (const entry of Array.from(CoreMaps._allData.entries())) {
      if (entry[0].endsWith(dataKey)) {
        if (!iteration || iteration === iter) {
          CoreMaps._testData = entry[1];
          if (qe !== undefined) qe.testData = entry[1];
          return entry[1];
        }
        iter++;
      }
    }

    if (CoreMaps._testData.size === 0) {
      await this.log.debug(
        `If test data is required: [TestName,DataKey] of [${dataKey}] should be found in 'allData' map`,
      );
    }

    return new Map();
  }

  public getIterationRowsCount(testName: string): number {
    if (CoreMaps._allData === undefined)
      CoreMaps._allData = this.setAllData();

    let iterationCount: number = 0;
    const dataKey = `${testName}.${process.env.DATAKEY!.trim()}`;

    for (const key of Array.from(CoreMaps._allData.keys())) {
      if ((key as string).endsWith(dataKey)) {
        iterationCount++;
      }
    }

    return iterationCount;
  }

  public async get(key: string | string[]): Promise<string | null> {
    let keyValue: string | null = typeof key === 'string' ? key : key[0];

    if (CoreMaps._testData.has(keyValue))
      keyValue = await CoreMaps._testData.get(keyValue);

    if (keyValue !== null) {
      keyValue = keyValue.trim();

      if (keyValue.includes('[') || keyValue.includes(']')) {
        if (keyValue.startsWith('[')) {
          keyValue = keyValue.substring(1, keyValue.length);
        }
        if (keyValue.endsWith(']')) {
          keyValue = keyValue.substring(0, keyValue.length - 1);
        }
      }
    }

    if (keyValue !== null && (await this.isDataType(keyValue))) {
      const providerFactory = new DataProviderFactory();
      const provider = providerFactory.getDataProvider(keyValue);
      keyValue = provider.get();
    }

    return keyValue;
  }

  public async getName(): Promise<IName> {
    const first: string =
      names[Math.round(1999 * Math.random())].firstName;
    const last: string =
      names[Math.round(1999 * Math.random())].lastName;

    return { first: first, last: last };
  }

  public async getPhone(spaces?: boolean): Promise<string> {
    const myNumber: string =
      '0' + (await this.get('[NUM#1000000000#9999999999]'));

    if (!spaces) return myNumber;
    return `${myNumber.slice(0, 2)} ${myNumber.slice(
      2,
      6,
    )} ${myNumber.slice(6, 10)}`;
  }

  public async getInternationalPhone(spaces?: boolean): Promise<string> {
    const myNumber: string =
      '+61' + (await this.get('[NUM#1000000000#9999999999]'));

    if (!spaces) return myNumber;
    return `${myNumber.slice(0, 3)} ${myNumber.slice(
      3,
      7,
    )} ${myNumber.slice(7, 11)}`;
  }

  public async getMobile(spaces?: boolean): Promise<string> {
    const myNumber: string | null = await this.get('[NUM#8]');
    if (!spaces) return `04${myNumber}`;
    return `04${myNumber!.slice(0, 2)} ${myNumber!.slice(
      2,
      5,
    )} ${myNumber!.slice(5, 8)}`;
  }

  public async getEmail(
    first: string | IName,
    last?: string,
  ): Promise<string> {
    const firstName: string =
      typeof first !== 'string' ? first.first : first;
    const lastName: string | undefined =
      typeof first !== 'string' ? first.last : last;

    const newName: string =
      names[Math.round(1999 * Math.random())].lastName;

    const domain: string[] = [
      '.com',
      '.co',
      '.net',
      '.biz',
      '.io',
      '.it',
      '.gov',
    ];

    const domainExt: string[] = ['.au', '.il'];

    return `${firstName}${lastName}${newName}${
      domain[Math.floor(Math.random() * domain.length)]
    }${
      domainExt[Math.floor(Math.random() * domainExt.length)]
    }`.toLowerCase();
  }

  public async getTestData(
    key: string | string[],
    currentData?: string | null,
  ): Promise<string | null> {
    key = typeof key === 'string' ? key : key[0];

    if (currentData === undefined || currentData === null) {
      if (await this.has(key)) return await this.get(key);
    } else {
      if (await this.has(currentData)) return await this.get(currentData);
    }

    return currentData === undefined || currentData === null
      ? key
      : currentData;
  }

  public async isDataType(keyValue: string): Promise<boolean> {
    if (!isNaN(parseFloat(keyValue))) return false;
    return Object.keys(DataType).includes(keyValue.split('#')[0]);
  }

  public async has(key: string | string[]): Promise<boolean> {
    const keyValue: string = typeof key === 'string' ? key : key[0];
    return CoreMaps._testData.has(keyValue);
  }

  public async debug_PrintDataMaps(): Promise<void> {
    await this.log.debug(
      'All data entries:',
      CoreMaps._allData.entries(),
  );

    await this.log.debug(
      'test data entries:',
      CoreMaps._testData.entries(),
    );
  }

  public initEnvProps(): Map<string, any> {
    const cleanPath: any = this.paths.sanitizeDirectory(
      this.props.envPropsPath,
    );

    const properties = PropertiesReader(
      `${cleanPath + this.process.TARGET}.properties`,
    );

    CoreMaps._env = new Map(
      Object.entries(properties.getAllProperties()),
    );

    this.log.environment(
      `Environment props set for: ${this.process.TARGET}.properties`,
    );

    return CoreMaps._env;
  }

  public initObjProps(...propsFiles: string[]): void {
    if (this.props.baseObjectPath) {
      const basePath: any = this.paths.sanitizeDirectory(
        this.props.baseObjectPath,
      );

      let objMap: Map<string, any> = new Map();

      try {
        propsFiles.map((propsFile: string): void => {
          let filePath: string = this.files.getMatchingFilesPath(
            basePath,
            `${propsFile}.properties`,
          );

          if (!filePath)
            filePath = this.files.getMatchingFilesPath(
              basePath,
              `${propsFile}.json`,
            );

          if (!filePath) {
            throw new Error(
              `Unable to locate file ${propsFile} in ${basePath} or any of its sub folders with .properties or .json extension`,
            );
          }

          let dataArray: Map<string, any> = new Map();

          if (filePath.endsWith('.properties')) {
            const properties = PropertiesReader(filePath);
            if (properties !== null)
              dataArray = new Map(
                Object.entries(properties.getAllProperties()),
              );
          } else {
            const data: string | null =
              this.files.getFileContent(filePath);

            if (data !== null)
              dataArray = JSON.parse(
                data
                  .replace(/\r/g, '\n')
                  .replace(/\n+/g, '\n')
                  .trim(),
              );

            dataArray = new Map(Object.entries(dataArray));
          }

          objMap = new Map([...objMap, ...dataArray]);
        });
      } catch (err: any) {
        throw Error(err.stack !== undefined ? err.stack : err.message);
      }

      CoreMaps._obj = objMap;
    }
  }

  public initQueryProps(fileName: string): void {
    const cleanPath: any = this.paths.sanitizeDirectory(
      this.props.queryPropsPath,
    );

    const properties = PropertiesReader(
      `${cleanPath + fileName}.sql`,
    );

    CoreMaps._dbQueries = new Map(
      Object.entries(properties.getAllProperties()),
    );
  }

  public async getCSVDataMAP(
    dataFile: string,
    headerRow?: boolean,
  ): Promise<Array<Map<any, any>>> {
    try {
      const csvFile: string = (await this.files.getFileContent(dataFile))!
        .replace(/\r/g, '\n')
        .replace(/\n+/g, '\n')
        .trim();

      const csvRows: string[] = csvFile.split('\n');
      const colCount: number = !headerRow
        ? await this.getColumnMax(csvRows)
        : 0;

      const csvMap: Array<Map<number | string, string>> = [];
      let keys: string[] = [];

      for (const entry of csvRows) {
        if (entry.trim().length > 0) {
          const columns: string[] = entry
            .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g)
            .map((item: string): string => item.trim());

          const dataSet = new Map();

          if (headerRow && csvRows.indexOf(entry) < 1) {
            keys = columns;
          } else if (!headerRow && colCount > 0) {
            for (let i = 0; i < colCount; i++) {
              columns[i] =
                columns[i].startsWith('"') &&
                columns[i].endsWith('"')
                  ? columns[i].slice(1, -1)
                  : columns[i];

              dataSet.set(i, columns[i]);
            }
          } else {
            keys.forEach((key: string, i: number): void => {
              columns[i] =
                columns[i].startsWith('"') &&
                columns[i].endsWith('"')
                  ? columns[i].slice(1, -1)
                  : columns[i];

              dataSet.set(key, columns[i]);
            });
          }

          if (dataSet.size > 0) csvMap.push(dataSet);
        }
      }

      return csvMap;
    } catch (err: any) {
      throw Error(err.stack !== undefined ? err.stack : err.message);
    }
  }

  public async getCSVDataJSON(
    dataFile: string,
    headerRow?: boolean,
  ): Promise<any[]> {
    try {
      let csvFile: string = (await this.files.getFileContent(dataFile))!
        .replace(/\r/g, '\n')
        .replace(/\n+/g, '\n')
        .trim();

      let options: { transform: (value: string) => string } = {
        transform: (value: string): string => value.trim(),
      };

      if (headerRow) {
        options = merge(options, {
          header: true,
          transformHeader(header: string): string {
            return header.replace(/"/g, '').trim();
          },
        });
      }

      const { data } = parse(csvFile, options);
      return data;
    } catch (err: any) {
      throw Error(err.stack !== undefined ? err.stack : err.message);
    }
  }

  public async convertJSONToCSV(
    jsonData: any,
    removeHeader?: boolean,
  ): Promise<string> {
    try {
      let csvData: string;
      const options = {
        header: !removeHeader,
      };

      csvData = await unparse(jsonData, options);
      return csvData;
    } catch (err: any) {
      throw Error(err.stack !== undefined ? err.stack : err.message);
    }
  }

  private async getColumnMax(csvRows: string[]): Promise<number> {
    let baseColumnCount: number = 0;

    for (const entry of csvRows) {
      const columns: string[] = entry
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g)
        .map((item: string): string => item.trim());

      if (columns.length > baseColumnCount)
        baseColumnCount = columns.length;
    }

    return baseColumnCount;
  }
}
