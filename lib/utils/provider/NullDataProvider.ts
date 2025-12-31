import AbstractDataProvider from "./AbstractDataProvider";

export default class NullDataProvider extends AbstractDataProvider {
    constructor(key: string) {
        super(key);
    }

    protected getData(): null {
        return null;
    }
}
