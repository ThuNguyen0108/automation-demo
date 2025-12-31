import AbstractDateProvider from './AbstractDateProvider';

export default class DateDataProvider extends AbstractDateProvider {
    /**
     * For date format refer to
     * <p>
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
     */
    constructor(key: string) {
        super(key);
    }

    protected getData(): string {
        return this.getDate(false);
    }
}
