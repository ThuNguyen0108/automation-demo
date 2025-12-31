import { Route } from 'playwright/test';
import { PlaywrightInstance } from '@core';
import {
    IMockRoute,
    IMockRouteUtil,
    IMockRouteWithCondition,
} from './mockRouteUtil.interface';
import { Page } from 'playwright-core';

export class MockRouteUtil implements IMockRouteUtil {
    constructor() {}

    private get _page(): Page {
        return PlaywrightInstance.getInterface() as unknown as Page;
    }

    public async route({
                           endpoint,
                           options,
                           delayMs,
                           routeCallback,
                       }: IMockRoute): Promise<void> {
        await this._page.route(endpoint, async (route: Route): Promise<void> => {
            if (delayMs) {
                await new Promise(
                    (resolve: (value: unknown) => void) =>
                        setTimeout(resolve, delayMs),
                );
            }

            if (routeCallback) {
                routeCallback(route);
            } else {
                await route.fulfill(options);
            }
        });
    }

    public async routes(mockRoutes: IMockRoute[]): Promise<void> {
        await Promise.all(
            mockRoutes.map(
                (mockRoute: IMockRoute): Promise<void> =>
                    this.route(mockRoute),
            ),
        );
    }

    public async resetRoutes(): Promise<void> {
        await this._page.unrouteAll();
    }

    public async routeWithCondition(
        mockRoute: IMockRouteWithCondition,
    ): Promise<void> {
        const { shouldMockFn: matchFn, ...routeData } = mockRoute;

        await this.route({
            ...routeData,
            routeCallback: async (route: Route): Promise<void> => {
                if (matchFn && !matchFn(route)) {
                    await route.continue();
                    return;
                }

                if (routeData.routeCallback) {
                    routeData.routeCallback(route);
                } else {
                    await route.fulfill(routeData.options);
                }
            },
        });
    }

    public async routesWithConditions(
        mockRoutes: IMockRouteWithCondition[],
    ): Promise<void> {
        await Promise.all(
            mockRoutes.map(
                (mockRoute: IMockRouteWithCondition): Promise<void> =>
                    this.routeWithCondition(mockRoute),
            ),
        );
    }
}
