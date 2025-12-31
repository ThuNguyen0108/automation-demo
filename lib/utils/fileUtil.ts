import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { CoreLibrary } from '@core';
import { ICoreAPIUtil } from './apiUtil.interface';
import { IDataUtil } from './dataUtil.interface';
import { IFileUtil } from './fileUtil.interface';
import { ILogUtil } from './logUtil.interface';
import { CoreSupportUtil } from './supportUtil';
import { ICoreSupportUtil } from './supportUtil.interface';
import { PathUtil } from './pathUtil';

const pathUtil = new PathUtil();

export class FileUtil implements IFileUtil {
    private get log(): ILogUtil {
        return CoreLibrary.log;
    }

    private get support(): ICoreSupportUtil {
        if (CoreLibrary.support === undefined) return new CoreSupportUtil();
        return CoreLibrary.support;
    }

    private get api(): ICoreAPIUtil {
        return CoreLibrary.api;
    }

    private get files(): IFileUtil {
        return CoreLibrary.files;
    }

    private get data(): IDataUtil {
        return CoreLibrary.data;
    }

    private get paths(): any {
        return CoreLibrary.paths;
    }

    // @Step('Return file content if ${1} exists', true)
    public getFileContent(filePath: string): string | null {
        const cleanPath: string = pathUtil.sanitizePath(filePath);
        try {
            if (this.exists(cleanPath))
                return fs.readFileSync(cleanPath, {
                    encoding: 'utf8',
                    flag: 'r'
                });
        } catch (err: any) {
            throw Error(
                `getFileContent() error for ${cleanPath}\n${err.stack !== undefined ? err.stack : err.message}`,
            );
        }
        return null;
    }

    public async writeContentToFile(
        filePath: string,
        data: string,
    ): Promise<void> {
        const cleanPath: string = pathUtil.sanitizePath(filePath);
        try {
            await fs.writeFileSync(cleanPath, data, {
                encoding: 'utf8',
                flag: 'w',
            });
        } catch (err: any) {
            throw new Error(
                `Write content to file issue: ${cleanPath}\n${err.stack !== undefined ? err.stack : err.message}`,
            );
        }
    }

    public async isDirectory(path: string): Promise<boolean> {
        return fs.lstatSync(path).isDirectory();
    }

    public async size(path: string): Promise<number> {
        return fs.statSync(path).size;
    }

    public async appendContentToFile(
        filePath: string,
        data: string,
    ): Promise<void> {
        const cleanPath: string = pathUtil.sanitizePath(filePath);
        try {
            await fs.appendFileSync(cleanPath, data, {
                encoding: 'utf8',
                flag: 'a',
            });
        } catch (err: any) {
            throw new Error(
                `Append content to file issue: ${cleanPath}\n${err.stack !== undefined ? err.stack : err.message}`,
            );
        }
    }

    public exists(pathToVerify: string): boolean {
        const cleanPath: string = pathUtil.sanitizePath(pathToVerify);
        try {
            if (fs.existsSync(cleanPath)) {
                const fullPath: string = path.join(process.cwd(), cleanPath);
                if (fs.existsSync(fullPath)) {
                    this.log
                        .warning(
                            `Path was not found here [${cleanPath}],\nPath was found here instead [${fullPath}]\nPlease verify the path.`,
                        )
                        .then();
                }
                return true;
            } else {
                return true;
            }
        } catch (err: any) {
            throw new Error(
                `this.files.exists(): for ${cleanPath}: ${err.stack !== undefined ? err.stack : err.message}`,
            );
        }
        return false;
    }

    public async deleteDirectory(directoryPath: string): Promise<void> {
        const cleanPath: string = pathUtil.sanitizePath(directoryPath);
        try {
            if (await this.exists(cleanPath)) {
                fs.rm(cleanPath, { recursive: true }, (err: any): void => {
                    if (err) throw err;
                });
                await this.log.pass(`Directory ${cleanPath} is deleted`)
            } else {
                await this.log.debug(
                    `Directory ${cleanPath} did not exist to delete`,
                );
            }
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }

    public async createFile(filePath: string): Promise<void> {
        const cleanPath: string = pathUtil.sanitizePath(filePath);
        try {
            await fs.open(
                cleanPath, 'w',
                function (err): void {
                    if (err) throw err;
                },
            );
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }

    public async deleteFile(filePath: string): Promise<void> {
        const cleanPath: string = pathUtil.sanitizePath(filePath);
        try {
            if (await this.exists(cleanPath)) {
                fs.unlinkSync(cleanPath);
            }
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }

    public async copyFile(source: string, destination: string): Promise<void> {
        const cleanSource: string = pathUtil.sanitizePath(source);
        const cleanDestination: string = pathUtil.sanitizePath(destination);
        const destinationPath: string = cleanDestination.substring(
            0,
            cleanDestination.lastIndexOf(path.sep),
        );
        try {
            if (
                (await this.exists(cleanSource)) &&
                (await this.exists(destinationPath))
            ) {
                await fs.copyFile(
                    cleanSource,
                    cleanDestination,
                    function (err): void {
                        if (err) throw err;
                    },
                );
            } else {
                await this.log.fail(
                    `File/Path does not exist for copy:${cleanSource} or destination does not exist`,
                );
            }
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }

    public async copyDirectory(
        sourcePath: string,
        destPath: string,
    ): Promise<void> {
        const cleanSourcePath: string = pathUtil.sanitizePath(sourcePath);
        const cleanDestPath: string = pathUtil.sanitizePath(destPath);
        try {
            if (await this.exists(cleanSourcePath)) {
                await fs.cp(
                    cleanSourcePath,
                    cleanDestPath,
                    { recursive: true },
                    function (err): void {
                        if (err) throw err;
                    },
                );
            }
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }

    public createDirectory(directoryPath: string): boolean {
        const cleanPath: string = pathUtil.sanitizePath(directoryPath);
        if (!fs.existsSync(cleanPath)) {
            fs.mkdirSync(cleanPath, { recursive: true });
        }

        return fs.existsSync(cleanPath);
    }

    public async addDirectory(directoryPath: string): Promise<boolean> {
        const cleanPath: string = pathUtil.sanitizePath(directoryPath);
        if (!(await this.exists(cleanPath))) {
            fs.mkdirSync(cleanPath, { recursive: true });
        }
        if (!(await this.exists(cleanPath)))
            await this.log.debug(
                `Directory creation 'failed' for [${cleanPath}]`,
            );
        return await this.exists(cleanPath);
    }

    public getMatchingFilesPath(
        directoryPath: string,
        fileName: string,
    ): string {
        const cleanPath: string = pathUtil.sanitizePath(directoryPath);
        const result: string[] = this.getAllMatchingFilesPaths(
            cleanPath,
            fileName,
            true,
        );
        return result[0];
    }

    // @Step('Return file paths in ${1} directory that matches ${2}', true)
    public getAllMatchingFilesPaths(
        directoryPath: string,
        fileName: string,
        firstMatch?: boolean,
    ): string[] {
        // This is where we store pattern matches of all files inside the directory
        const cleanPath: string = pathUtil.sanitizePath(directoryPath);
        firstMatch = firstMatch || false;
        let results: string[] = [];
        try {
            // Read contents of directory
            for (let dirInner of fs.readdirSync(cleanPath)) {
                // Obtain absolute path
                dirInner = path.resolve(cleanPath, dirInner);
                // Get stats to determine if path is a directory or a file
                const type = fs.statSync(dirInner);
                // If path is a matching file add to array
                if (type.isFile() && dirInner.endsWith(fileName)) {
                    results.push(dirInner);
                    if (firstMatch) return results;
                }

                // If path is a directory, scan it and combine results
                if (type.isDirectory()) {
                    results = results.concat(
                        this.getAllMatchingFilesPaths(
                            dirInner,
                            fileName,
                            firstMatch,
                        ),
                    );
                    if (
                        results.length > 0 &&
                        firstMatch &&
                        dirInner.endsWith(fileName)
                    )
                        return results;
                }
            }
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
        return results;
    }

    // @Step('Return all file paths in ${1} directory that match extension ${2}', true)
    public getAllFilePaths(directoryPath: string, ext?: string): string[] {
        // This is where we store pattern matches of all files inside the directory
        const cleanPath: string = pathUtil.sanitizePath(directoryPath);
        let results: string[] = [];
        try {
            // Read contents of directory
            for (let dirInner of fs.readdirSync(cleanPath)) {
                // Obtain absolute path
                dirInner = path.resolve(cleanPath, dirInner);
                // Get stats to determine if path is a directory or a file
                const type = fs.statSync(dirInner);
                // If path is a directory, scan it and combine results
                if (type.isDirectory())
                    results = results.concat(
                        this.getAllFilePaths(dirInner, ext),
                    );
                // If path is a file, set it as first result and exit
                if (type.isFile()) {
                    if (ext && dirInner.endsWith(ext)) {
                        results.push(dirInner);
                    }
                }
            }
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
        return results;
    }

    public getSubDirectories(directoryPath: string): string[] {
        const cleanPath: string = pathUtil.sanitizePath(directoryPath);
        let results: string[] = [];
        try {
            // Read contents of directory
            for (let dirInner of fs.readdirSync(cleanPath)) {
                // Obtain absolute path
                dirInner = path.resolve(cleanPath, dirInner);
                // Get stats to determine if path is a directory or a file
                const type = fs.statSync(dirInner);
                // If path is a directory, scan it and combine results
                if (type.isDirectory()) {
                    results.push(dirInner);
                    results = results.concat(this.getAllFilePaths(dirInner));
                }
            }
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
        return results;
    }

    public async getLatestFile(directoryPath: string): Promise<string> {
        let latest: any;
        const cleanPath: string = pathUtil.sanitizePath(directoryPath);
        try {
            const files: string[] = fs.readdirSync(cleanPath);
            files.forEach((fileName: string): void => {
                // Get the stat
                const stat = fs.lstatSync(path.join(cleanPath, fileName));
                // Pass if it is a directory
                if (stat.isDirectory()) return;
                // latest default to first file
                if (!latest) {
                    latest = { filename: fileName, mtime: stat.mtime };
                    return;
                }
                // update latest if mtime is greater than the current latest
                if (stat.mtime > latest.mtime) {
                    latest.filename = fileName;
                    latest.mtime = stat.mtime;
                }
            });
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }

        return latest.filename;
    }

    public async decompressZIP(
        source: string,
        destination: string,
        checkFilePath?: string,
    ): Promise<void> {
        try {
            const result = new Promise<void>(
                async (
                    resolve: (value: void | PromiseLike<void>) => void,
                    reject: (reason?: any) => void,
                ): Promise<void> => {
                    try {
                        const zip = new AdmZip(source);
                        await this.addDirectory(destination);
                        await zip.extractAllTo(destination, true);
                        if (checkFilePath)
                            process.stdout.write(
                                `Should have completely unzipped file: ${await this.exists(
                                    checkFilePath,
                                )}\n`,
                            );
                        resolve();
                    } catch (err: any) {
                        await this.log.debug(`Source:${source}`);
                        await this.log.debug(`Destination:${destination}`);
                        await this.log.debug(
                            `Error zipping to the folder:${err.toString()}`,
                        );
                        reject(err);
                    }
                },
            );

            result
                .then(async (): Promise<void> => {
                    await this.log.debug('Decompression completed');
                })
                .catch(async (error: any): Promise<void> => {
                    await this.log.fail(error);
                });
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }

    public async compressZIP(
        source: string,
        destinationPath?: string,
        zipFileName?: string,
    ): Promise<void> {
        try {
            let destination: string = destinationPath || source;
            // await this.log.debug(`Pre edit Destination:${destination}`);
            if (zipFileName) {
                if (destination.substring(destination.length - 1) !== path.sep)
                    destination += path.sep;
                destination += zipFileName;
            }
            if (!destination.includes('zip')) destination += '.zip';
            // await this.log.debug(`Source:${source}`);
            // await this.log.debug(`Destination:${destination}`);
            const result = new Promise<void>(
                async (
                    resolve: (value: void | PromiseLike<void>) => void,
                    reject: (reason?: any) => void,
                ): Promise<void> => {
                    try {
                        const zip = new AdmZip();
                        await zip.addLocalFolder(source);
                        await zip.writeZip(destination);
                        resolve();
                    } catch (err: any) {
                        await this.log.debug(`Source:${source}`);
                        await this.log.debug(`Destination:${destination}`);
                        await this.log.debug(
                            `Error zipping to the folder:${err.toString()}`,
                        );
                        reject(err);
                    }
                },
            );

            result
                .then(async (): Promise<void> => {
                    if (!this.exists(destination))
                        await this.log.fail(
                            `Should have completely zipped file:${destination}`,
                        );
                })
                .catch(async (error: any): Promise<void> => {
                    await this.log.fail(error);
                });
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }

    public async downloadFileFromURL(
        source: string,
        destination: string,
    ): Promise<any> {
        try {
            const response: any = await this.api.returnGet(source, {
                responseType: 'arraybuffer',
            });

            await this.files
                .writeContentToFile(destination, response.data)
                .then(async (): Promise<void> => {
                    // fs.writeFileSync(destination, Buffer.from(fileData), 'binary');
                    const expectedSize: any = response.headers['content-length'];
                    const actualSize: number = (await fs.promises.stat(destination)).size;

                    if (expectedSize && Number(expectedSize) !== actualSize)
                        throw new Error(
                            `File download incomplete: ${actualSize} !== ${expectedSize}`,
                        );
                });
        } catch (err: any) {
            await this.log.debug(`Source:${source}`);
            await this.log.debug(`Destination:${destination}`);
            await this.log.fail(
                `Unable to Download and store: ${err.toString()}`,
            );
        } finally {
            await this.log.debug(
                `File completely downloaded to:${destination}`,
            );
        }
    }

    public async excelToJSON(
        sourceFile: string,
        sheetName?: string,
    ): Promise<any> {
        if (await this.exists(sourceFile)) {
            try {
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.readFile(sourceFile);

                if (sheetName) {
                    const worksheet =
                        workbook.getWorksheet(sheetName);
                    return worksheet ? this.worksheetToJSON(worksheet) : undefined;
                } else {
                    const result: any = {};
                    workbook.eachSheet((worksheet): void => {
                        result[worksheet.name] = this.worksheetToJSON(worksheet);
                    });
                    return result;
                }
            } catch (err: any) {
                throw Error(err.stack !== undefined ? err.stack : err.message);
            }
        }
    }

    private worksheetToJSON(worksheet: ExcelJS.Worksheet): any[] {
        const jsonData: any[] = [];
        const headers: string[] = [];

        worksheet.eachRow((row, rowNumber: number): void => {
            if (rowNumber === 1) {
                row.eachCell((cell): void => {
                    headers.push(cell.value?.toString() || '');
                });
            } else {
                const rowData: any = {};
                row.eachCell((cell, colNumber: number): void => {
                    rowData[headers[colNumber - 1]] = cell.value;
                });
                jsonData.push(rowData);
            }
        });

        return jsonData;
    }

    public async JSONToFile(
        outputPath: string,
        jsonData: {},
    ): Promise<void> {
        const jsonString: string = await JSON.stringify(jsonData, null, 2);
        const outputPathDir: string = await path.dirname(outputPath);

        await this.addDirectory(outputPathDir);
        await this.writeContentToFile(outputPath, jsonString);

        await this.log.result(
            await this.exists(outputPath),
            `JSON data should be converted to JSON file successfully and stored:${outputPath}`,
        );
    }

    public getFileNameFromPath(
        filePath: string,
        extension?: boolean | true,
    ): string {
        filePath = pathUtil.sanitizePath(filePath);
        let fileName: string = filePath.substring(
            filePath.lastIndexOf(path.sep) + 1,
        );
        if (extension === false) fileName = fileName.split('.')[0];
        return fileName;
    }

    public async joinMultipleCSVFile(
        directoryPath: string,
        fileName: string,
        mainFile: string,
        ...otherFile: string[]
    ): Promise<void> {
        const dirPath: string = pathUtil.sanitizePath(directoryPath);

        let finalFile: any[] = await this.data.getCSVDataJSON(
            `${dirPath}${mainFile}.csv`,
            true,
        );

        let arrayFile: string[] = otherFile;

        for (let i: number = 0; i < arrayFile.length; i++) {
            let tempFile: any[] = await this.data.getCSVDataJSON(
                `${dirPath}${arrayFile[i]}.csv`,
                true,
            );

            const isDupColumn: string[] = Object.keys(tempFile[0]).filter(
                (element: string): boolean =>
                    Object.keys(finalFile[0]).includes(element),
            );

            const noDupColumn: string[] = Object.keys(tempFile[0]).filter(
                (element: string): boolean =>
                    !Object.keys(finalFile[0]).includes(element),
            );

            if (isDupColumn.length !== 0) {
                for (let dupKey of isDupColumn) {
                    await this.renameJsonKey(
                        finalFile,
                        `${mainFile}_` + dupKey,
                        dupKey,
                    );

                    await this.renameJsonKey(
                        tempFile,
                        `${arrayFile[i]}_` + dupKey,
                        dupKey,
                    );

                    finalFile = finalFile.map((item: any, i: number): any =>
                        Object.assign({}, item, tempFile[i]),
                    );
                }
            }

            if (noDupColumn.length !== 0) {
                finalFile = finalFile.map((item: any, i: number): any =>
                    Object.assign({}, item, tempFile[i]),
                );

                for (let noDupKey of noDupColumn) {
                    await this.renameJsonKey(
                        finalFile,
                        `${arrayFile[i]}_` + noDupKey,
                        noDupKey,
                    );
                }
            }
        }

        const csv: string = await this.data.convertJSONToCSV(
            JSON.stringify(finalFile),
        );

        await this.writeContentToFile(
            `${dirPath}${fileName}.csv`,
            csv,
        );
    }

    private async renameJsonKey(
        jsonObj: {
            [x: string]: any;
        }[],
        newKey: string,
        oldKey: string | number,
    ): Promise<void> {
        jsonObj.forEach((obj: { [x: string]: any }): void => {
            obj[newKey] = obj[oldKey];
            delete obj[oldKey];
        });
    }

    public async generateCSVFile(
        desFilePath: string,
        fileName: string,
        writeVertical: boolean,
        header: any[],
        ...row: any[]
    ): Promise<void> {
        let rowArray: any[];
        let maxRowLength: number = 0;

        if (!writeVertical) {
            rowArray = row[0];
            maxRowLength = Math.max(...[...rowArray].map((el: any): any => el.length));
        } else {
            row = [].concat(...row);
            maxRowLength = Math.max(...[...row].map((el: any): any => el.length));
            rowArray = row;
        }

        rowArray.forEach((arr: any): void => {
            const count: number = maxRowLength - arr.length;
            if (count > 0) {
                for (let i: number = 0; i < count; i++) {
                    arr.push('NO-DATA');
                }
            }
        });

        const temptArr: never[] = [].concat(...row);
        const chunk: number = maxRowLength;

        const rowContentArray: any[] = temptArr.reduce(
            (r: any[][], v: any, i: number): any[] => {
                (r[i % chunk] = r[i % chunk] || []).push(v);
                return r;
            },
            [],
        );

        let finalArray: any = [];
        let data: string = '';

        for (let i: number = 0; i < rowContentArray.length; i++) {
            const convertRow: any = rowContentArray[i].toString();
            i === rowContentArray.length - 1
                ? finalArray.push(convertRow)
                : finalArray.push(convertRow + '\n');

            data = header.toString() + '\n' + finalArray.join('');
        }

        const filePath: string = path.join(
            process.cwd(),
            pathUtil.sanitizePath(desFilePath),
        );

        await this.addDirectory(filePath);
        await this.writeContentToFile(`${filePath}${fileName}.csv`, data );
    }

    public async addLogLine(
        logFile: string,
        line: string,
        ext?: string,
    ): Promise<void> {
        const filePath: string = pathUtil.sanitizePath(
            path.resolve(this.paths.output + logFile + (!ext ? '.log' : ext)),
        );

        await fs.writeFile(
            filePath,
            `${line}\n`,
            { flag: 'a+' },
            function (err): void {
                if (err) throw err;
            },
        );
    }

    public async cleanFileDateStamp(): Promise<string> {
        return (await this.data.get('[DATE#YYYYMMDD_HHmmss_sss]')) || '';
    }
}





