import AlphaDataProvider from './AlphaDataProvider';
import BizDateDataProvider from './BizDateDataProvider';
import CashDataProvider from './CashDataProvider';
import ClearDataProvider from './ClearDataProvider';
import DateDataProvider from './DateDataProvider';
import { IDataProvider } from './IDataProvider';
import NullDataProvider from './NullDataProvider';
import NumDataProvider from './NumDataProvider';
import RandomDataProvider from './RandomDataProvider';

export enum DataType {
    ALPHA = 0,
    BLANK = 1,
    BIZDATE = 2,
    CASH = 3,
    CLEAR = 4,
    DATE = 5,
    NULL = 6,
    NUM = 7,
    SKIP = 8,
    STR = 9,
    NAME = 10,
}

export default class DataProviderFactory {
    /**
     * <p>
     * Returns a value based on the supplied command.
     * </p>
     *
     * @param key the value to create, based on a supplied command
     * @return the data provider associated with the provided key e.g. [NUM#10] will return the NumDataProvider
     */
    getDataProvider(key: string): IDataProvider {
        let dp;

        if (key.startsWith(DataType[DataType.DATE])) {
            dp = new DateDataProvider(key);
        } else if (key.startsWith(DataType[DataType.BIZDATE])) {
            dp = new BizDateDataProvider(key);
        } else if (key.startsWith(DataType[DataType.CASH])) {
            // if no Int Param
            if (key.split('#').length - 1 < 1) {
                throw new Error(
                    'Expected parameters not supplied for CashDataProvider.get',
                );
            } else {
                dp = new CashDataProvider(key);
            }
        } else if (key.startsWith(DataType[DataType.NUM])) {
            if (key.split('#').length - 1 < 1) {
                throw new Error(
                    'Expected parameters not supplied for NumDataProvider.get',
                );
            } else {
                dp = new NumDataProvider(key);
            }
        } else if (key.startsWith(DataType[DataType.STR])) {
            if (key.split('#').length - 1 !== 1) {
                throw new Error(
                    'Expected parameters not supplied for RandomDataProvider.get',
                );
            } else {
                dp = new RandomDataProvider(key);
            }
        } else if (key.startsWith(DataType[DataType.ALPHA])) {
            if (key.split('#').length - 1 !== 1) {
                throw new Error(
                    'Expected parameters not supplied for AlphaDataProvider.get',
                );
            } else {
                dp = new AlphaDataProvider(key);
            }
        } else if (
            key.startsWith(DataType[DataType.NULL]) ||
            key.startsWith(DataType[DataType.BLANK]) ||
            key.startsWith(DataType[DataType.SKIP])
        ) {
            dp = new NullDataProvider(key);
        } else if (key.startsWith(DataType[DataType.CLEAR])) {
            dp = new ClearDataProvider(key);
        }

        if (dp == null) {
            throw new Error(
                `Key ${key} returned NULL and may not have been catered for in getDataProvider`,
            );
        }

        return dp;
    }
}
