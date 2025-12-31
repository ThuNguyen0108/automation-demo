export interface IQTestUtil {
    setConfig: () => void;
    addTest: (test: any, result: any) => Promise<void>;
    hasProjectID: () => boolean;
}