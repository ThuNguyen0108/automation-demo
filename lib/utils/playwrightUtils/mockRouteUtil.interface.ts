import { APIResponse, Route } from '@playwright/test';

export interface IMockFulfillOptions {
    /**
     * Response body.
     */
    body?: string | Buffer;

    /**
     * If set, equals to setting 'Content-Type' response header.
     */
    contentType?: string;

    /**
     * Response headers. Header values will be converted to a string.
     */
    headers?: { [key: string]: string };

    /**
     * JSON response. This method will set the content type to 'application/json' if not set.
     */
    json?: any;

    /**
     * File path to respond with. The content type will be inferred from file extension.
     * If 'path' is a relative path, then it is resolved relative to the current working directory.
     */
    path?: string;

    /**
     * [APIResponse](https://playwright.dev/docs/api/class-apiresponse) to fulfill route's request with.
     * Individual fields of the response (such as headers) can be overridden using fulfill options.
     */
    response?: APIResponse;

    /**
     * Response status code, defaults to '200'.
     */
    status?: number;
}

export interface IMockRoute {
    /**
     * Endpoint or the url that will be mock.
     */
    endpoint: string;

    /**
     * Options to fulfill in mocking the route
     */
    options: IMockFulfillOptions;

    /**
     * Specify the delays of time it takes to call the mock route.
     */
    delayMs?: number;

    /**
     * This function enables consumer to have a callback function of the route being mock.
     * @param {Route} route - The route that is being mock.
     * @returns {void}
     */
    routeCallback?: (route: Route) => void;
}

export interface IMockRouteWithCondition extends IMockRoute {
    /**
     * This functions check if it should continue mocking the route or not
     * If true, continue to mock the route
     * else, stop mocking the route
     * @param {Route} route - The route that is being mock.
     * @returns {boolean}
     */
    shouldMockFn?: (route: Route) => boolean;
}

export interface IMockRouteUtil {
    /**
     * This function enables consumer to mock a route and its response.
     * @param {IMockRoute} mockRoute - Contains the route information that will be mock.
     * @returns {void}
     */
    route(mockRoute: IMockRoute): void;

    /**
     * This function enables consumer to mock multiple routes and its response.
     * @param {IMockRoute[]} mockRoutes - Contains the array of route information that will be mock.
     * @returns {void}
     */
    routes(mockRoutes: IMockRoute[]): void;

    /**
     * This function enables consumer to mock a route and its response when shouldMockFn returns true; otherwise it ignores the mocking.
     * @param {IMockRouteWithCondition} mockRoute - Contains the route information that will be mock with its fulfilling condition.
     * @returns {void}
     */
    routeWithCondition(mockRoute: IMockRouteWithCondition): void;

    /**
     * This function enables consumer to mock multiple routes and its response when shouldMockFn returns true; otherwise it ignores the mocking.
     * @param {IMockRouteWithCondition[]} mockRoutes - Contains the array of route information that will be mock with its fulfilling condition.
     * @returns {void}
     */
    routesWithConditions(mockRoutes: IMockRouteWithCondition[]): void;

    /**
     * This function will reset all mocked routes
     */
    resetRoutes(): void;
}
