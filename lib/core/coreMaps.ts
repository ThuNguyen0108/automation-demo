export class CoreMaps {
    public static _allData: Map<string, Map<string, any>>;
    public static _testData: Map<string, any>;
    public static _obj: Map<string, any>;
    public static _env: Map<string, any>;
    public static _dbQueries: Map<string, any>;
    public static _txn: Map<string, any>;

    constructor() {
        if (CoreMaps._allData === undefined) {
            CoreMaps._allData = new Map();
            CoreMaps._testData = new Map();
            CoreMaps._obj = new Map();
            CoreMaps._env = new Map();
            CoreMaps._dbQueries = new Map();
            CoreMaps._txn = new Map();
        }
    }
}

export class GetCurrentMap {
    private currentMap: () => Map<any, any>;

    constructor(userMap: () => Map<string, any> | Map<string, Map<string, any>>) {
        this.currentMap = userMap;
    }

    public get(key: string): any {
        return this.currentMap().get(key);
    }

    public has(key: string): any {
        return this.currentMap().has(key);
    }

    public set(key: string, value: any): void {
        this.currentMap().set(key, value);
    }

    public entries(): IterableIterator<[string, any]> {
        return this.currentMap().entries();
    }
}