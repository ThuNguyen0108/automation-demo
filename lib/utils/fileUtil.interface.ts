export interface IFileUtil {
    /**
     * Used for file and directory checks
     * can be full path with file name to check for existing file
     * or just check directory path
     * @param pathToVerify either file path or directory path
     */
    exists: (dirPath: string) => boolean;
    writeContentToFile: (filePath: string, data: string) => Promise<void>;
    isDirectory: (dirPath: string) => Promise<boolean>;
    size: (dirPath: string) => Promise<number>;
    appendContentToFile: (filePath: string, data: string) => Promise<void>;
    addDirectory: (directoryPath: string) => Promise<boolean>;
    getSubDirectories: (directoryPath: string) => string[];
    createDirectory: (directoryPath: string) => boolean;
    deleteDirectory: (dirPath: string) => Promise<void>;
    deleteFile: (filePath: string) => Promise<void>;
    copyFile: (sourcePath: string, destPath: string) => Promise<void>;
    copyDirectory: (sourcePath: string, destPath: string) => Promise<void>;
    createFile: (filePath: string) => Promise<void>;
    getFileContent: (filePath: string) => string | null;
    getLatestFile: (downloadDir: string) => Promise<string>;

    /**
     * Returns the first file found that match the supplied file name and source directory
     * @param directoryPath
     * @param fileName
     */
    getMatchingFilesPath: (folderPath: string, fileName: string) => string;

    /**
     * Returns an array of files that match the supplied file name and
     * source directory regardless of what sub directory they are found
     * @param directoryPath
     * @param fileName
     * @param firstMatch
     */
    getAllMatchingFilesPaths: (
        folderPath: string,
        fileName: string,
        firstMatch?: boolean,
    ) => string[];

    /**
     * Returns ALL file paths from a directory
     * @param directoryPath full path of the directory (from root) required
     * @param {optional} ext (extension) if required
     */
    getAllFilePaths: (folderPath: string, ext?: string) => string[];

    /**
     * Archives/Compresses a directory or file into .zip format
     * @param source - path to the folder or file to be zipped
     * @param destinationPath - path where the zipped folder or file to be saved
     * @param zipFileName - optional - unique zip file name
     * @returns
     */
    compressZIP: (
        source: string,
        destinationPath?: string,
        zipFileName?: string,
    ) => Promise<void>;

    /**
     * Unzips/Decompresses an archived folder
     * @param zipPath - path to the zipped folder along with the name (For eg. ./build/logs/myCompressedFile.zip)
     * @param destPath - path where the un-zipped folder to be saved
     * @param checkFilePath - optional - file that should be available after unzip
     * @returns
     */
    decompressZIP: (
        zipPath: string,
        destPath: string,
        checkFilePath?: string,
    ) => Promise<void>;

    /**
     * Downloads a file from a url location and saves it to the project destination
     * @param source
     * @param destination
     */
    downloadFileFromURL: (source: string, destination: string) => Promise<any>;

    /**
     * Accepts the location of a file and returns the file name with extension
     * @param filePath path you want the file name extracted
     * @param extension boolean, true for returning string with extension, false for without extension
     * returns string
     */
    getFileNameFromPath: (filePath: string, extension?: boolean) => string;

    /**
     * Used to convert Excel source data files to JSON objects for use in test
     * @param sourceFile string path to file to convert
     */
    // excelToJSON: (sourceFile: string, outputPath?: string, separateSheets?: boolean, sheetName?: string)
    excelToJSON: (sourceFile: string, sheetName?: string) => Promise<any>;

    /**
     * Save a JSON object to a .json file
     * @param outputPath - full path including file name that the JSON should be stored
     * @param jsonData - JSON object
     * @constructor
     */
    JSONToFile: (outputPath: string, jsonData: {}) => Promise<void>;

    joinMultipleCSVFile: (
        directoryPath: string,
        fileName: string,
        mainFile: string,
        ...otherFile: string[]
    ) => Promise<void>;

    generateCSVFile: (
        desFilePath: string,
        fileName: string,
        writeVertical: boolean,
        header: any[],
        ...row: any[]
    ) => Promise<void>;

    addLogLine: (logFile: string, line: string, ext?: string) => Promise<void>;

    /**
     * Returns a string value with a file-system appropriate date string for easy and "unique" file naming
     */
    cleanFileDateStamp: () => Promise<string>;
}

export interface CompareOptions {
    ignoreWhitespace?: boolean;
    ignoreCase?: boolean;
    sortArrays?: boolean;
}

export interface ComparisonResult {
    equal: boolean;
    differences: {
        line: number | null;
        message: string;
    }[];
}
