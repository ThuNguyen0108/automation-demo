import {
    BatchInfo,
    Configuration,
    ClassicRunner,
    VisualGridRunner,
    Eyes,
    MatchLevel,
    Target,
} from '@applitools/eyes-playwright';
import {
    IPlaywrightProjectProps,
    PlaywrightLibrary,
    ScreenListItem,
} from '@core';
import { IApplitoolsUtil } from './applitoolsUtil.interface';

let props: IPlaywrightProjectProps;

export class ApplitoolsUtil implements IApplitoolsUtil {
    constructor() {}

    private get props(): IPlaywrightProjectProps {
        props = PlaywrightLibrary.playwrightProjectProps;
        return PlaywrightLibrary.playwrightProjectProps;
    }

    /**
     * take a snapshot (DOM or screen image) and send it to Applitools servers for rendering and comparison
     * @param checkName - string - usually the test name or the step description
     * @param matchLevel - value to match the values of MatchLevel: "None" | "Layout1" | "Layout" | "Layout2" | ...
     */
    public async check(
        checkName: string,
        matchLevel?: MatchLevel,
    ): Promise<void> {
        await this.checkRegion(checkName, undefined, matchLevel);
    }

    public async checkRegion(
        checkName: string,
        regionSelector?: string,
        matchLevel?: MatchLevel,
    ): Promise<void> {
        let localErr;

        if (this.props.applitools.apiKey.length > 3) {
            try {
                process.stdout.write(
                    `Applitools check-point on displayed UI: ${checkName}. {optional} by selector: ${regionSelector}\n with {optional} match level ${matchLevel}.\n`,
                );

                if (!(global as any).applitools)
                    this.initializeApplitools();

                const { runner, config } = (global as any).applitools;
                const eyes = new Eyes(runner, config);

                matchLevel = matchLevel || MatchLevel.Layout;

                try {
                    // Get current page from test context - this would need to be passed or accessed from context
                    const page: any = (global as any).currentPage; // This needs proper implementation
                    await eyes.open(
                        page,
                        this.props.applitools.applicationName,
                        checkName,
                    );
                } catch (Err) {
                    console.error(
                        `failure in applitoolsUtil > check > eyes.open: \n${Err}`,
                    );
                    throw Err;
                }

                try {
                    if (regionSelector === undefined) {
                        await eyes.check(
                            checkName,
                            Target.window().matchLevel(matchLevel).fully(),
                        );
                    } else {
                        await eyes.check(
                            checkName,
                            Target.region(regionSelector).matchLevel(matchLevel),
                        );
                    }
                } catch (Err) {
                    console.error(
                        `failure in applitoolsUtil > check > eyes.check: \n${Err}`,
                    );
                    throw Err;
                }

                try {
                    await eyes.close(false);
                } catch (Err) {
                    console.error(
                        `failure in applitoolsUtil > check > eyes.close: \n${Err}`,
                    );
                    throw Err;
                }
            } catch (err: any) {
                localErr = err.toString();
                console.error(localErr);
                throw err;
            }
        }
    }

    public initializeApplitools(): any {
        if ((global as any).applitools) {
            return (global as any).applitools;
        }

        const USE_ULTRAFAST_GRID: boolean =
            this.props.applitools.runnerType === 'grid';

        // Create runner based on configuration
        const runner: VisualGridRunner | ClassicRunner =
            USE_ULTRAFAST_GRID
                ? new VisualGridRunner({
                    testConcurrency: this.props.applitools.concurrency,
                })
                : new ClassicRunner();

        // Create batch info
        const batch = new BatchInfo(this.props.applitools.batchName);

        // Create and configure the Eyes configuration
        const config = new Configuration();
        config.setBatch(batch);
        config.setAppName(this.props.applitools.applicationName);
        config.setBranchName(
            process.env.APPLITOOLS_BRANCH_NAME ||
            this.props.applitools.branchName,
        );

        if (!this.props.applitools.apiKey) {
            throw new Error(
                'APPLITOOLS_API_KEY environment variable is not set',
            );
        }

        config.setApiKey(this.props.applitools.apiKey);

        // Set proxy if provided
        if (this.props.applitools.proxy) {
            config.setProxy(this.props.applitools.proxy);
        } else {
            if (process.platform === 'linux')
                config.setProxy(process.env.HTTPS_PROXY!);
        }

        // Set connection timeout
        config.setConnectionTimeout(120000); // 120 seconds for proxy connections

        // Disable browser fetching to improve performance
        config.setDisableBrowserFetching(true);

        config.setServerUrl(this.props.applitools.url);

        // Configure browsers for Ultrafast Grid
        if (USE_ULTRAFAST_GRID) {
            props.applitools.screens.forEach(
                (ui: ScreenListItem): void => {
                    if ('deviceName' in ui && ui.deviceName) {
                        config.addDeviceEmulation(
                            ui.deviceName,
                            ui.screenOrientation,
                        );
                    } else if (
                        'width' in ui &&
                        'height' in ui &&
                        ui.name
                    ) {
                        config.addBrowser(ui.width, ui.height, ui.name);
                    }
                },
            );
        }

        (global as any).applitools = { runner, config };
        return (global as any).applitools;
    }
}
