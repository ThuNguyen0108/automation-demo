import fs from 'fs';
import path from 'node:path';
import Papa from 'papaparse';
import { XMLParser } from 'fast-xml-parser';
import { CompareOptions, ComparisonResult } from './fileUtil.interface';

export interface IFileDiffUtil {
    txt(fileA: string, fileB: string, options?: CompareOptions): ComparisonResult;
    csv(fileA: string, fileB: string, options?: CompareOptions): ComparisonResult;
    json(fileA: string, fileB: string, options?: CompareOptions): ComparisonResult;
    xml(fileA: string, fileB: string, options?: CompareOptions): ComparisonResult;
}

export class FileDiffUtil {
    public txt(
        fileA: string,
        fileB: string,
        options: CompareOptions = {},
    ): ComparisonResult {
        const [contentA, contentB, fileError] = this.loadInputs(fileA, fileB);
        if (fileError) return fileError;
        return this.compareText(contentA!, contentB!, options);
    }

    public csv(
        fileA: string,
        fileB: string,
        options: CompareOptions = {},
    ): ComparisonResult {
        const [contentA, contentB, fileError] = this.loadInputs(fileA, fileB);
        if (fileError) return fileError;
        return this.compareCSV(contentA!, contentB!, options);
    }

    public json(
        fileA: string,
        fileB: string,
        options: CompareOptions = {},
    ): ComparisonResult {
        const [contentA, contentB, fileError] = this.loadInputs(fileA, fileB);
        if (fileError) return fileError;
        return this.compareJSON(contentA!, contentB!, options);
    }

    public xml(
        fileA: string,
        fileB: string,
        options: CompareOptions = {},
    ): ComparisonResult {
        const [contentA, contentB, fileError] = this.loadInputs(fileA, fileB);
        if (fileError) return fileError;
        return this.compareXML(contentA!, contentB!, options);
    }

    private loadInputs(
        fileA: string,
        fileB: string,
    ): [string | null, string | null, ComparisonResult | null] {
        const getContent = (
            input: string,
        ): [string | null, string | null] => {
            const fullPath: string = path.resolve(input);
            if (!fs.existsSync(fullPath)) {
                return [null, `File not found: ${fullPath}`];
            }
            return [fs.readFileSync(fullPath, { encoding: 'utf-8' }), null];
        };

        const [contentA, errorA] = getContent(fileA);
        const [contentB, errorB] = getContent(fileB);

        if (errorA || errorB) {
            return [
                null,
                null,
                {
                    equal: false,
                    differences: [
                        ...(errorA ? [{ line: null, message: errorA }] : []),
                        ...(errorB ? [{ line: null, message: errorB }] : []),
                    ],
                },
            ];
        }

        return [contentA, contentB, null];
    }

    private normalize(value: string, options: CompareOptions): string {
        if (options.ignoreWhitespace) value = value.trim();
        if (options.ignoreCase) value = value.toLowerCase();
        return value;
    }

    private compareText(
        fileA: string,
        fileB: string,
        options: CompareOptions,
    ): ComparisonResult {
        const linesA: string[] = fileA.split('\n');
        const linesB: string[] = fileB.split('\n');
        const differences: any[] = [];
        const maxLen: number = Math.max(linesA.length, linesB.length);

        for (let i: number = 0; i < maxLen; i++) {
            let lineA: string = linesA[i] ?? '';
            let lineB: string = linesB[i] ?? '';
            if (
                this.normalize(lineA, options) !==
                this.normalize(lineB, options)
            ) {
                differences.push({
                    line: i + 1,
                    message: `Line ${i + 1} differs: "${lineA}" vs "${lineB}"`,
                });
            }
        }

        return { equal: differences.length === 0, differences };
    }

    private compareCSV(
        fileA: string,
        fileB: string,
        options: CompareOptions,
    ): ComparisonResult {
        const parseCSV = (content: string): string[][] => {
            return Papa.parse<string[]>(content.trim(), {
                skipEmptyLines: options.ignoreWhitespace || false,
                delimiter: ',',
                newline: '\n',
            }).data;
        };

        const rowsA: string[][] = parseCSV(fileA);
        const rowsB: string[][] = parseCSV(fileB);
        const differences: any[] = [];
        const maxLen: number = Math.max(rowsA.length, rowsB.length);

        for (let i: number = 0; i < maxLen; i++) {
            const rowA: string[] = rowsA[i] ?? [];
            const rowB: string[] = rowsB[i] ?? [];
            const maxCols: number = Math.max(rowA.length, rowB.length);

            if (
                options.ignoreWhitespace &&
                rowA.every((cell: string) => !cell.trim()) &&
                rowB.every((cell: string) => !cell.trim())
            ) {
                continue;
            }

            if (
                rowA.length === rowB.length &&
                rowA.every(
                    (cell: string, j: number): boolean =>
                        cell === rowB[j],
                )
            ) {
                continue;
            }

            for (let j: number = 0; j < maxCols; j++) {
                const cellA: string = rowA[j] ?? '';
                const cellB: string = rowB[j] ?? '';
                if (
                    this.normalize(cellA, options) !==
                    this.normalize(cellB, options)
                ) {
                    differences.push({
                        line: i + 1,
                        message: `Row ${i + 1}, Column ${
                            j + 1
                        } differs: "${cellA}" vs "${cellB}"`,
                    });
                }
            }
        }

        return { equal: differences.length === 0, differences };
    }

    private compareObjects(
        fileA: string,
        fileB: string,
        parseFunc: (input: string) => any,
        errorPrefix: string,
        options: CompareOptions,
    ): ComparisonResult {
        let objA: any, objB: any;
        try {
            objA = parseFunc(fileA);
            objB = parseFunc(fileB);
        } catch (e) {
            return {
                equal: false,
                differences: [
                    {
                        line: null,
                        message: `Invalid ${errorPrefix}: ${
                            (e as Error).message
                        }`,
                    },
                ],
            };
        }

        if (options.sortArrays) {
            objA = this.sortArraysRecursively(objA);
            objB = this.sortArraysRecursively(objB);
        }

        const diffs: string[] = this.deepCompareObjects(
            objA,
            objB,
            '',
            options,
        );

        return {
            equal: diffs.length === 0,
            differences: diffs.map((msg: string) => ({
                line: null,
                message: msg,
            })),
        };
    }

    private compareJSON(
        fileA: string,
        fileB: string,
        options: CompareOptions,
    ): ComparisonResult {
        return this.compareObjects(
            fileA,
            fileB,
            JSON.parse,
            'JSON',
            options,
        );
    }

    private compareXML(
        fileA: string,
        fileB: string,
        options: CompareOptions,
    ): ComparisonResult {
        const parser = new XMLParser({
            ignoreAttributes: false,
            trimValues: options.ignoreWhitespace ?? false,
        });

        return this.compareObjects(
            fileA,
            fileB,
            (input: string): any => parser.parse(input),
            'XML',
            options,
        );
    }

    private deepCompareObjects(
        fileA: any,
        fileB: any,
        path: string,
        options: CompareOptions,
    ): string[] {
        const diffs: string[] = [];

        if (fileA === fileB) return [];

        if (fileA == null || fileB == null) {
            return fileA === fileB
                ? []
                : [`Value mismatch at ${path || '.'}: ${fileA} vs ${fileB}`];
        }

        if (typeof fileA !== typeof fileB) {
            return [
                `Type mismatch at ${path || '.'}: ${typeof fileA} vs ${typeof fileB}`,
            ];
        }

        if (Array.isArray(fileA) && Array.isArray(fileB)) {
            if (fileA.length !== fileB.length) {
                return [
                    `Array length mismatch at ${path}: ${fileA.length} vs ${fileB.length}`,
                ];
            }
            for (let i: number = 0; i < fileA.length; i++) {
                diffs.push(
                    ...this.deepCompareObjects(
                        fileA[i],
                        fileB[i],
                        `${path}[${i}]`,
                        options,
                    ),
                );
            }
            return diffs;
        }

        if (typeof fileA !== 'object' || typeof fileB !== 'object') {
            const valA: string = this.normalize(
                String(fileA),
                options,
            );
            const valB: string = this.normalize(
                String(fileB),
                options,
            );
            return valA !== valB
                ? [`Value mismatch at ${path || '.'}: "${fileA}" vs "${fileB}"`]
                : [];
        }

        const keys = new Set([
            ...Object.keys(fileA),
            ...Object.keys(fileB),
        ]);

        for (const key of keys) {
            const newPath: string = path ? `${path}.${key}` : key;
            if (!(key in fileA)) {
                diffs.push(`Key "${key}" missing in first at ${newPath}`);
            } else if (!(key in fileB)) {
                diffs.push(`Key "${key}" missing in second at ${newPath}`);
            } else {
                diffs.push(
                    ...this.deepCompareObjects(
                        fileA[key],
                        fileB[key],
                        newPath,
                        options,
                    ),
                );
            }
        }

        return diffs;
    }

    private isObject(
        value: unknown,
    ): value is Record<string, unknown> {
        return (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)
        );
    }

    private sortArraysRecursively(value: any): any {
        if (Array.isArray(value)) {
            return [...value]
                .map((v: any) => this.sortArraysRecursively(v))
                .sort((a: any, b: any): number => {
                    const strA: string = JSON.stringify(a);
                    const strB: string = JSON.stringify(b);
                    return strA.localeCompare(strB);
                });
        }

        if (this.isObject(value)) {
            return Object.fromEntries(
                Object.entries(value)
                    .sort(
                        (
                            [keyA]: [string, unknown],
                            [keyB]: [string, unknown],
                        ): number => keyA.localeCompare(keyB),
                    )
                    .map(
                        ([k, v]: [string, unknown]): [string, any] => [
                            k,
                            this.sortArraysRecursively(v),
                        ],
                    ),
            );
        }

        return value;
    }
}
