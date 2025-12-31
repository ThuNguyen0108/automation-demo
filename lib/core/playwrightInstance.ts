import { Page } from 'playwright-core';
import { coreSetup } from './coreInstance';
import { UserOverrides } from './coreLibrary';
import { PlaywrightLibrary, IPlaywrightLibrary } from './index';

export class PlaywrightInstance {
    private static _instance: IPlaywrightLibrary;
    private static _overrides: UserOverrides;
    private static _interface: Page | null;

    constructor(overrides: UserOverrides) {
        PlaywrightInstance._overrides = overrides;
    }

    static getInterface(): Page | null {
        return PlaywrightInstance._interface;
    }

    static get(type?: Page | null): IPlaywrightLibrary {
        if (type) PlaywrightInstance._interface = type;
        // Ensure instance is initialized before returning
        if (!PlaywrightInstance._instance) {
            return PlaywrightInstance.instance;
        }
        return PlaywrightInstance._instance;
    }

    public static get instance(): IPlaywrightLibrary {
        if (!PlaywrightInstance._instance) {
            coreSetup();
            PlaywrightInstance._instance = PlaywrightLibrary.instance.get(
                PlaywrightInstance._overrides,
            );
        }
        return PlaywrightInstance._instance;
    }
}
