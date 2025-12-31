import AbstractDataProvider from './AbstractDataProvider';

export default class ClearDataProvider extends AbstractDataProvider {
    /**
     * <p>
     * Returns a value based on the supplied criteria.
     * [CLEAR] will return a string of a single space character
     * Intended to be used to clear a field that may have a value
     * </p>
     *
     * @param key the value to parse, e.g.[CLEAR] to return a string of one space
     * @return the evaluated string
     */
    constructor(key: string) {
        super(key);
    }

    protected getData(): string {
        return ' ';
    }
}
