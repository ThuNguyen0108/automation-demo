import AbstractDataProvider, { RandomChar } from './AbstractDataProvider';

export default class RandomDataProvider extends AbstractDataProvider {
    /**
     * <p>
     * Returns a value based on the supplied criteria.
     * [STR#LEN] will return a string of the requested length (LEN) (including spaces and non-alpha chars)
     * </p>
     *
     * @param key the value to parse, e.g.[STR#5] to return a string of length of 5 random alpha/numeric/symbol characters
     * @return the evaluated string
     */
    constructor(key: string) {
        super(key);
    }

    protected getData(): string {
        return this.randomString(this.getIntParam(1), RandomChar.ALL);
    }
}
