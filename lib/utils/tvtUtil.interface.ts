export interface ITVTUtil {
    tvtTestStart: (title: string) => Promise<void>;
    tvtEntry: (test: any, result: any) => Promise<void>;
    tvtFinaliseFile: () => Promise<void>;
    isTVT: () => boolean;
    getTVTComponentName: () => string;
    setTVTComponentName: (component: string) => void;
  }
  