import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AgentOptions } from 'https';
import * as fs from 'node:fs';
import * as https from 'node:https';
import { CoreLibrary, CoreMaps } from '@core';
import { ICoreAPIUtil } from './apiUtil.interface';
import { ILogUtil } from './logUtil.interface';

let axiosInstance: AxiosInstance;

export class CoreAPIUtil implements ICoreAPIUtil {

    private get log(): ILogUtil {
        return CoreLibrary.log;
    }

    private initAPI(options?: https.AgentOptions): AxiosInstance {
        try {
            if (options === undefined) {
                options = new https.Agent({
                    cert: fs.readFileSync(CoreMaps._env.get('api_cert')),
                    key: fs.readFileSync(CoreMaps._env.get('api_key')),
                    rejectUnauthorized: false,
                });
            }

            return axios.create({ httpsAgent: options });
        } catch (err: any) {
            throw err;
        }
    }

    // create a class with a singleton instance and a map of string, any
    public getApiInstance(options?: AgentOptions): AxiosInstance {
        if (axiosInstance === undefined) axiosInstance = this.initAPI(options);
        return axiosInstance;
    }

    // POST
    public async returnPost(
        url: string,
        config: AxiosRequestConfig,
        payload: any,
        options?: https.AgentOptions,
    ): Promise<any> {
        try {
            config = {
                ...config,
                data: payload,
                validateStatus: function (status: number): boolean {
                    return status >= 200 && status < 500;
                },
            };

            return this.getApiInstance(options)
                .post(url, payload, config)
                .then((res: any): any => {
                    return res;
                })
                .catch(function (error: any): any {
                    return error;
                });
        } catch (err: any) {
            throw err;
        }
    }

    // GET
    public async returnGet(
        url: string,
        config: AxiosRequestConfig,
        options?: https.AgentOptions,
    ): Promise<any> {
        try {
            config = {
                ...config,
                validateStatus: function (status: number): boolean {
                    return status >= 200 && status < 500;
                },
            };

            return this.getApiInstance(options)
                .get(url, config)
                .then((res: any): any => {
                    return res;
                })
                .catch(function (error: any): any {
                    process.stdout.write(`GET:${error.toString()}\n`);
                    return error;
                });
        } catch (err: any) {
            throw err;
        }
    }

    // DELETE
    public async returnDelete(
        url: string,
        config: AxiosRequestConfig,
        payload?: any,
        options?: https.AgentOptions,
    ): Promise<any> {
        try {
            config = {
                ...config,
                data: payload,
                validateStatus: function (status: number): boolean {
                    return status >= 200 && status < 500;
                },
            };

            return this.getApiInstance(options)
                .delete(url, config)
                .then((res: any): any => {
                    return res;
                })
                .catch(function (error: any): any {
                    process.stdout.write(`DELETE:${error.toString()}\n`);
                    return error;
                });
        } catch (err: any) {
            throw err;
        }
    }

    // PUT
    public async returnPut(
        url: string,
        config: AxiosRequestConfig,
        payload: any,
        options?: https.AgentOptions,
    ): Promise<any> {
        try {
            config = {
                ...config,
                data: payload,
                validateStatus: function (status: number): boolean {
                    return status >= 200 && status < 500;
                },
            };

            return this.getApiInstance(options)
                .put(url, payload, config)
                .then((res: any): any => {
                    return res;
                })
                .catch(function (error: any): any {
                    process.stdout.write(`PUT:${error.toString()}\n`);
                    return error;
                });
        } catch (err: any) {
            throw err;
        }
    }

    // PATCH
    public async returnPatch(
        url: string,
        config: AxiosRequestConfig,
        payload: any,
        options?: https.AgentOptions,
    ): Promise<any> {
        try {
            config = {
                ...config,
                data: payload,
                validateStatus: function (status: number): boolean {
                    return status >= 200 && status < 500;
                },
            };

            return this.getApiInstance(options)
                .patch(url, payload, config)
                .then((res: any): any => {
                    return res;
                })
                .catch(function (error: any): any {
                    process.stdout.write(`PATCH:${error.toString()}\n`);
                    return error;
                });
        } catch (err: any) {
            throw err;
        }
    }

    public async isResponseStatus(
        response: any,
        status: number,
    ): Promise<boolean> {
        return (
            typeof response.status === 'number' &&
            response.status === status
        );
    }

    public async hasResponseDataField(
        response: any,
        field: string,
    ): Promise<boolean> {
        const responseArray: Map<string, string> = new Map(
            Object.entries(response.data),
        );
        return responseArray.has(field);
    }

    public async getResponseDataFieldValue(
        response: any,
        field: string,
    ): Promise<string> {
        let fieldValue;
        const hasResult: boolean = await this.hasResponseDataField(response, field);

        await this.log.result(
            hasResult,
            `field[${field}] should be found in response ${hasResult ? JSON.stringify(response) : ''}`
        );

        const responseArray: Map<string, string> = new Map(
            Object.entries(response.data),
        );

        fieldValue = responseArray.get(field);

        await this.log.result(
            fieldValue !== undefined,
           `Value [${fieldValue}] for response field [${field}] should been retrieved`
        );

        return fieldValue || '';
    }

    public async matchesResponseDataField(
        response: any,
        field: string,
        expected: string,
        caseSensitive: boolean,
    ): Promise<void> {

        await this.log.result(
            await this.hasResponseDataField(response, field),
            `field[${field}] should be found in response[${response}]`,
        );

        const actual: string = await this.getResponseDataFieldValue(response, field);

        const check: boolean = caseSensitive
            ? actual === expected.trim()
            : actual.toUpperCase() === expected.toUpperCase().trim();

        await this.log.result(
            check,
            `Value[${actual}] for response field [${field}] should match expected[${expected}]`,
        );
    }
}
