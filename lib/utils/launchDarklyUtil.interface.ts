export interface ILaunchDarklyUtil {
    getFlagStatus: (flagnName: string) => Promise<boolean>;
    setFlagStatus: (flagnName: string, state: boolean) => Promise<any>;
    getAllFlags: () => Promise<Map<string, any>>;
    getFlag: (flagName: string) => Promise<Response>;
}