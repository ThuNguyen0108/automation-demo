export interface ICoreTransactionUtil {
    initSLA: (sla: number) => Promise<void>;
    start: (key: string, tempSLA?: number) => Promise<void>;
    end: (key: string, outcome?: 'test' | 'debug') => Promise<void>;
    getDate: () => Promise<string>;
    clear: () => Promise<void>;
}