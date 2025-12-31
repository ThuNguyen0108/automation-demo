export interface ILogUtil {
    environment: (msg: string, data?: any) => void;
    debug: (msg: string | any[], data?: any) => Promise<void>;
    err: (msg: string) => Promise<void>;
    fail: (msg: string) => Promise<void>;
    warning: (msg: string) => Promise<void>;
    ally: (status: string, msg: string) => Promise<void>;
    pass: (msg: string) => Promise<void>;
    retry: (msg: string) => Promise<void>;
    result: (compare: boolean, msg: string) => Promise<void>;
    step: (msg: string, start?: boolean) => Promise<void>;
    stepEnd: () => Promise<void>;
    performance: (msg: string) => Promise<void>;
  }
  