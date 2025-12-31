import { IDataProvider } from './IDataProvider';

export enum RandomChar {
    ALPHA = 0,
    NUMERIC = 1,
    NON = 2,
    ALL = 3,
}

export default abstract class AbstractDataProvider implements IDataProvider {
    private static readonly PARAM_SPLIT: '#' = '#';

    private key: string;

    protected abstract getData(): string | null;

    constructor(key: string) {
        this.key = key;
    }

    protected getParam(index: number): string {
        return this.getKeys()[index];
    }

    protected getParamsLength(): number {
        return this.key.split('#').length - 1;
    }

    protected getIntParam(index: number): number {
        return parseInt(this.getKeys()[index]);
    }

    get(): string | null {
        try {
            return this.getData();
        } catch (err: any) {
            throw Error(
                 `Error occurred getting data from factory${err.message}`,
            );
        }
    }

    getKey(): string {
        return this.key;
    }

    getKeys(): string[] {
        return this.key.split(AbstractDataProvider.PARAM_SPLIT);
    }

    // aeiouAEIOU are eliminated to prevent incidental "words" being created
    private static strConst: string = 'BCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz';

    private static str09: string = '0123456789';

    private static strNon: string = '/*-+-~!@$%^&*()_+`=-[];\',./{}:<>?';

    randomString(len: number, rand: RandomChar): string {
        let str;
        switch (rand) {
            case RandomChar.ALPHA:
                str = AbstractDataProvider.strConst;
                break;
            case RandomChar.NUMERIC:
                str = AbstractDataProvider.str09;
                break;
            case RandomChar.NON:
                str = AbstractDataProvider.strNon;
                break;
            case RandomChar.ALL:
            default:
                str =
                    AbstractDataProvider.strConst +
                    AbstractDataProvider.str09 +
                    AbstractDataProvider.strNon;
        }

        let retString: string = '';
        for (let i: number = 0; i < len; i++) {
            retString += str.charAt(Math.round(Math.random() * (str.length - 1)));
        }

        return retString;
    }
}
