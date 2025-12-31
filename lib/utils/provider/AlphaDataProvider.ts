import AbstractDataProvider, { RandomChar } from './AbstractDataProvider';

export default class AlphaDataProvider extends AbstractDataProvider {
    /**
     * <p>
     * Returns a value based on the supplied criteria.
     * [ALPHA#LEN] will return a string of the requested length (LEN) (with no spaces and no non-alpha chars)
     * </p>
     *
     * @param key the value to parse, e.g.[ALPHA#5] to return a string of length of 5 random alphabetical characters
     * @return the evaluated string
     */
    constructor(key: string) {
        super(key);
    }

    protected getData(): string {
        return this.randomString(this.getIntParam(1), RandomChar.ALPHA);
    }
}
