import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { AgentOptions } from 'https';

export interface ICoreAPIUtil {
    getApiInstance: (options?: AgentOptions) => AxiosInstance;

    returnPost: (
        url: string,
        config: AxiosRequestConfig,
        payload: any,
        options?: AgentOptions,
    ) => Promise<any>;

    returnGet: (
        url: string,
        config: AxiosRequestConfig,
        options?: AgentOptions,
    ) => Promise<any>;

    returnDelete: (
        url: string,
        config: AxiosRequestConfig,
        payload?: any,
        options?: AgentOptions,
    ) => Promise<any>;

    returnPut: (
        url: string,
        config: AxiosRequestConfig,
        payload: any,
        options?: AgentOptions,
    ) => Promise<any>;

    returnPatch: (
        url: string,
        config: AxiosRequestConfig,
        payload: any,
        options?: AgentOptions,
    ) => Promise<any>;

    isResponseStatus: (response: any, status: number) => Promise<boolean>;

    hasResponseDataField: (
        response: any,
        field: string,
    ) => Promise<boolean>;

    matchesResponseDataField: (
        response: any,
        field: string,
        expected: string,
        caseSensitive: boolean,
    ) => Promise<void>;

    getResponseDataFieldValue: (
        response: any,
        field: string,
    ) => Promise<string | undefined>;
}
