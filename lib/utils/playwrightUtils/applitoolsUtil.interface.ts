import { BrowserType, DeviceName, EyesRunner, ScreenOrientation} from "@applitools/eyes-playwright";
import { MatchLevel } from '@applitools/eyes-playwright';

export interface IApplitoolsUtil {
    initializeApplitools(): {
        runner: EyesRunner;
        config: any;
    };
    check: (checkName: string, matchLevel?: MatchLevel) => Promise<void>;
    checkRegion: (
        checkName: string,
        regionSelector?: string,
        matchLevel?: MatchLevel,
    ) => Promise<void>;
}

export type DeviceScreen = {
    deviceName: DeviceName;
    screenOrientation: ScreenOrientation;
}

export type BrowserScreen = {
    width: number;
    height: number;
    name: BrowserType;
}
