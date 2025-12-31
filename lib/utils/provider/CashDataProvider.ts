import AbstractDataProvider from './AbstractDataProvider';

export default class CashDataProvider extends AbstractDataProvider {
    private static readonly MAX_CENTS: 99 = 99;
    private static readonly MIN_CENTS: 1 = 1;

    /**
     * <p>
     * Returns a value based on the supplied criteria.
     * [CASH#LOWERBOUND#UPPERBOUND] will return a string of float value between LOWERBOUND AND (UPPERBOUND + 1 not inclusive)
     * </p>
     *
     * @param key the value to parse, e.g.[CASH#1#10] to return a float between 1 and 11
     * @return the evaluated string
     */
    constructor(key: string) {
        super(key);
    }

    protected getData(): string {
        let min: number = -1;
        let max: number = -1;

        if (this.getParamsLength() <= 0 || this.getParamsLength() > 2) {
            throw new Error('invalid params for cash generation');
        }

        if (this.getParamsLength() === 1) {
            const numLength: number = this.getIntParam(1);
            min = Number(`1${'0'.repeat(numLength - 1)}`); // starts 1xxxx
            max = Number('9'.repeat(numLength));
        } else if (this.getParamsLength() === 2) {
            min = this.getIntParam(1);
            max = this.getIntParam(2);
        }

        const dollars: number = Math.round(min + (max - min) * Math.random());
        const cents: number =
            +(
                CashDataProvider.MIN_CENTS +
                (CashDataProvider.MAX_CENTS - CashDataProvider.MIN_CENTS) *
                Math.random()
            ) / 100;

        return (dollars + cents).toFixed(2);
    }
}
