export type Proxy = {
    server: string;
    bypass?: string;
    userName?: string;
    password?: string;
};

export type PutPostPatchArgs = {
    uri: string;
    headers: Record<string, any>;
    requestBody?: object;
    multiPart?: {
        key: string;
        fullFilePath: string;
        mimeType: string;
    };
    formUrlEncoded?: Record<string, any>;
    params?: object;
    proxy?: Proxy;
};

export interface IAPIUtil {
    /**
     *
     * Returns a response object that has the status code, response headers and response body
     * @param uri URI of the API
     * @param headers Header object required for the API, e.g., Authorization, X-CorrelationID etc.,
     * @param proxy Optional parameter to specify a proxy server
     */
    returnGet: (
        uri: string,
        headers: object,
        params: object,
        proxy?: {
            server: string;
            bypass?: string;
            userName?: string;
            password?: string;
        },
    ) => Promise<object>;

    /**
     *
     * Returns a response object that has the status code, response headers and response body
     * @param args {uri: URI of the API, headers Header object required for the API, e.g., Authorization, X-CorrelationID etc.,
     * requestBody: Optional parameter to specify the request body
     * multiPart: Optional parameter to specify the multiPart file
     * formUrlEncoded: Optional parameter to specify the formUrlEncoded fields
     * params: Optional parameter to specify the parameters
     * proxy Optional parameter to specify a proxy server}
     */
    returnPost: (args: PutPostPatchArgs) => Promise<object>;

    /**
     *
     * Returns a response object that has the status code, response headers and response body
     * @param args {uri: URI of the API, headers Header object required for the API, e.g., Authorization, X-CorrelationID etc.,
     * requestBody: Optional parameter to specify the request body
     * multiPart: Optional parameter to specify the multiPart file
     * formUrlEncoded: Optional parameter to specify the formUrlEncoded fields
     * params: Optional parameter to specify the parameters
     * proxy Optional parameter to specify a proxy server}
     */
    returnPut: (args: PutPostPatchArgs) => Promise<object>;

    /**
     *
     * Returns a response object that has the status code, response headers and response body
     * @param args {uri: URI of the API, headers Header object required for the API, e.g., Authorization, X-CorrelationID etc.,
     * requestBody: Optional parameter to specify the request body
     * multiPart: Optional parameter to specify the multiPart file
     * formUrlEncoded: Optional parameter to specify the formUrlEncoded fields
     * params: Optional parameter to specify the parameters
     * proxy Optional parameter to specify a proxy server}
     */
    returnPatch: (args: PutPostPatchArgs) => Promise<object>;
}
