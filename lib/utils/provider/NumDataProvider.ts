import AbstractDataProvider from './AbstractDataProvider';

export default class NumDataProvider extends AbstractDataProvider {
    /**
     * <p>
     * Returns a value based on the supplied criteria.
     * [NUM#LEN] will return a string of the requested length (LEN)
     * </p>
     *
     * @param key the value to parse, e.g.[NUM#5] to return a integer of length 5 composed of random numeric characters
     * @return the evaluated string
     */
    constructor(key: string) {
        super(key);
    }

    protected getData(): string {
        let min: number = -1;
        let max: number = -1;

        if (this.getParamsLength() <= 0 || this.getParamsLength() > 2) {
            throw new Error('invalid params for number generation');
        }

        if (this.getParamsLength() === 1) {
            const numLength: number = this.getIntParam(1);
            min = Number(`1${'0'.repeat(numLength - 1)}`); // starts 1xxxx
            max = Number('9'.repeat(numLength));
        } else if (this.getParamsLength() === 2) {
            min = this.getIntParam(1);
            max = this.getIntParam(2);
        }

        return Math.round(min + (max - min) * Math.random()).toString();
    }
}
