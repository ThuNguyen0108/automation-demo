import { APIRequestContext, APIResponse, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { IAPIUtil, Proxy, PutPostPatchArgs } from './apiUtil.interface';

export class APIUtil implements IAPIUtil {
    /**
     *
     * Returns a response object that has the status code, response headers and response body
     * @param uri URI of the API
     * @param headers Header object required for the API. e.g., Authorization, X-CorrelationID etc.,
     * @param params Optional parameter to specify path params
     * @param proxy Optional parameter to specify a proxy server
     */
    public async returnGet(
        uri: string,
        headers: Record<string, any>,
        params?: object,
        proxy?: Proxy,
    ): Promise<APIResponse> {
        const proxyDetails: object = this.setProxy(proxy);
        const context: APIRequestContext =
            await this.setApiContext(proxyDetails);
        const parameters: Record<string, any> = this.setParams(params);

        return await context.get(uri, {
            headers: headers,
            params: parameters,
            ignoreHTTPSErrors: true,
        });
    }

    public async returnPost(
        args: PutPostPatchArgs,
    ): Promise<APIResponse> {
        const proxyDetails: object = this.setProxy(args.proxy);
        const context: APIRequestContext =
            await this.setApiContext(proxyDetails);
        const parameters: Record<string, any> =
            this.setParams(args.params);

        this.checkForMultiParameters(args);

        if (args.requestBody) {
            return await this.apiRequestWithData(
                context,
                parameters,
                args,
                'post',
            );
        } else if (args.multiPart) {
            return await this.apiRequestWithMultiPart(
                context,
                parameters,
                args,
                'post',
            );
        } else {
            return await this.apiRequestWithFormUrlEncoded(
                context,
                parameters,
                args,
                'post',
            );
        }
    }

    public async returnPut(
        args: PutPostPatchArgs,
    ): Promise<APIResponse> {
        const proxyDetails: object = this.setProxy(args.proxy);
        const context: APIRequestContext =
            await this.setApiContext(proxyDetails);
        const parameters: Record<string, any> =
            this.setParams(args.params);

        this.checkForMultiParameters(args);

        if (args.requestBody) {
            return await this.apiRequestWithData(
                context,
                parameters,
                args,
                'put',
            );
        } else if (args.multiPart) {
            return await this.apiRequestWithMultiPart(
                context,
                parameters,
                args,
                'put',
            );
        } else {
            return await this.apiRequestWithFormUrlEncoded(
                context,
                parameters,
                args,
                'put',
            );
        }
    }

    public async returnPatch(
        args: PutPostPatchArgs,
    ): Promise<APIResponse> {
        const proxyDetails: object = this.setProxy(args.proxy);
        const context: APIRequestContext =
            await this.setApiContext(proxyDetails);
        const parameters: Record<string, any> =
            this.setParams(args.params);

        this.checkForMultiParameters(args);

        if (args.requestBody) {
            return await this.apiRequestWithData(
                context,
                parameters,
                args,
                'patch',
            );
        } else if (args.multiPart) {
            return await this.apiRequestWithMultiPart(
                context,
                parameters,
                args,
                'patch',
            );
        } else {
            return await this.apiRequestWithFormUrlEncoded(
                context,
                parameters,
                args,
                'patch',
            );
        }
    }

    private async apiRequestWithData(
        context: APIRequestContext,
        parameters: Record<string, any>,
        args: PutPostPatchArgs,
        method: 'put' | 'post' | 'patch',
    ): Promise<APIResponse> {
        return await context[method](args.uri, {
            headers: args.headers,
            data: args.requestBody,
            params: parameters,
            ignoreHTTPSErrors: true,
        });
    }

    private async apiRequestWithMultiPart(
        context: APIRequestContext,
        parameters: Record<string, any>,
        args: PutPostPatchArgs,
        method: 'put' | 'post' | 'patch',
    ): Promise<APIResponse> {
        // check args.multiPart is defined
        if (!args.multiPart) {
            throw new Error('multiPart is not defined');
        }

        const file: string = path.resolve(args.multiPart.fullFilePath);
        const fileNameWithExtension: string =
            this.fetchFileNameWithExtensionFromPath(
                args.multiPart.fullFilePath,
            );
        const stream: Buffer = fs.readFileSync(file);
        const propertyName: string = args.multiPart.key;

        return await context[method](args.uri, {
            headers: args.headers,
            multipart: {
                [propertyName]: {
                    name: fileNameWithExtension,
                    mimeType: args.multiPart.mimeType,
                    buffer: stream,
                },
            },
            params: parameters,
            ignoreHTTPSErrors: true,
        });
    }

    private async apiRequestWithFormUrlEncoded(
        context: APIRequestContext,
        parameters: Record<string, any>,
        args: PutPostPatchArgs,
        method: 'put' | 'post' | 'patch',
    ): Promise<APIResponse> {
        return await context[method](args.uri, {
            headers: args.headers,
            form: args.formUrlEncoded,
            params: parameters,
            ignoreHTTPSErrors: true,
        });
    }

    private async setApiContext(
        proxyDetails: any,
    ): Promise<APIRequestContext> {
        if (proxyDetails) {
            return await request.newContext({ proxy: proxyDetails });
        }

        return await request.newContext();
    }

    private setParams(
        params?: object,
    ): Record<string, any> {
        if (!params || this.isObjEmpty(params)) {
            return {}; // Return empty object instead of null
        }

        return params as Record<string, any>;
    }

    private setProxy(
        proxy?: Record<string, any>,
    ): object {
        if (!proxy || this.isObjEmpty(proxy)) {
            return {}; // Return empty object instead of null
        }

        return proxy;
    }

    private isObjEmpty(obj: object): boolean {
        return Object.keys(obj).length === 0;
    }

    private checkForMultiParameters(
        args: PutPostPatchArgs,
    ): void {
        if (
            (args.requestBody && args.multiPart) ||
            (args.requestBody && args.formUrlEncoded) ||
            (args.multiPart && args.formUrlEncoded) ||
            (args.requestBody &&
                args.multiPart &&
                args.formUrlEncoded)
        ) {
            throw new Error(
                'Only one of requestBody or multiPart or formUrlEncoded can be provided',
            );
        }
    }

    private fetchFileNameWithExtensionFromPath(
        filePath: string,
    ): string {
        const str_arr: string[] = filePath.split('/');
        return str_arr[str_arr.length - 1];
    }
}
