import moment from 'moment';
import AbstractDataProvider from './AbstractDataProvider';

export default abstract class AbstractDateProvider extends AbstractDataProvider {
    private static readonly DAYS: 'D' = 'D';
    private static readonly MONTHS: 'M' = 'M';
    private static readonly YEARS: 'y' = 'y';

    private static readonly DEFAULT_DATE: 'DD/MM/yyyy' = 'DD/MM/yyyy';

    private static readonly SATURDAY: 6 = 6;
    private static readonly SUNDAY: 0 = 0;

    /**
     * <p>
     * Returns a value based on the input string passed in
     * [DATE will return a date value based on todays date in the default format of DD/MM/yyyy
     * NOTE: Date returned will not include Saturday or Sunday by default, to do so use BIZDATE
     * Variants include:
     * ** [DATE#INCREMENT]
     * ** [DATE#FORMATSTRING]
     * ** [DATE#FORMATSTRING#INCREMENT] or [DATE#INCREMENT#FORMATSTRING]
     * ** [DATE#MAP#INCREMENT#INCREMENTTYPE]
     * ** where INCREMENT = the integer value you want to +/- from todays date,
     * ** e.g. [DATE#2] would add 2 days to todays date and [DATE#-30] would MINUS 30 days from todays date
     * ** where FORMATSTRING = the required date format string that differs from the standard dd/MM/yyyy map for the
     * required string.
     * ** Formatting is performed using the moment class.
     * ** where TYPE = "d" for DAY or "M" for MONTH or "y" for YEAR
     * to allow the incrementer to be addressed by period
     * </p>
     *
     * @param key the input string used to create the value
     * @return the evaluated string
     */
    constructor(key: string) {
        super(key);
    }

    getDate(businessDays: boolean): string {
        let increment: number = 0;
        let incrementType: string = 'd';
        let formatString: string = AbstractDateProvider.DEFAULT_DATE;
        const dateArguments: string[] = this.getKeys();

        if (dateArguments.length > 1) {
            for (let i: number = 1; i < dateArguments.length; i++) {
                if (dateArguments[i] != null) {
                    if (
                        !isNaN(Number(dateArguments[i].charAt(0))) ||
                        dateArguments[i].startsWith('-')
                    ) {
                        increment = parseInt(dateArguments[i]);
                    } else if (
                        isNaN(Number(dateArguments[i].charAt(0))) &&
                        dateArguments[i].length === 1
                    ) {
                        incrementType = dateArguments[i];
                    } else {
                        formatString = dateArguments[i];
                    }
                }
            }
        }

        let incrementedMonthOrYear: boolean = false;
        const retDate = new Date(Date.now());

        if (incrementType.toUpperCase() === AbstractDateProvider.MONTHS) {
            const tempDate: number = retDate.getDate();
            const daysInMonth: number = new Date(
                retDate.getFullYear(),
                retDate.getMonth() + 1,
                0,
            ).getDate();

            retDate.setDate(1);
            retDate.setMonth(retDate.getMonth() + increment);
            retDate.setDate(Math.min(tempDate, daysInMonth));
            incrementedMonthOrYear = true;
        } else if (incrementType.toLowerCase() === AbstractDateProvider.YEARS) {
            retDate.setFullYear(retDate.getFullYear() + increment);
            incrementedMonthOrYear = true;
        } else if (incrementType.toUpperCase() === AbstractDateProvider.DAYS) {
            const negativeIncrement: boolean = increment < 0;
            increment = Math.abs(increment);

            for (let i: number = 1; i <= increment; i++) {
                if (negativeIncrement) {
                    retDate.setDate(retDate.getDate() - 1);
                } else {
                    retDate.setDate(retDate.getDate() + 1);
                }

                if (
                    businessDays &&
                    (retDate.getDay() === AbstractDateProvider.SATURDAY ||
                        retDate.getDay() === AbstractDateProvider.SUNDAY)
                ) {
                    i--;
                }
            }
        } else {
            throw new Error({
                message: `Supplied map ${formatString} with increment ${increment} and increment type ${incrementType} is incompatible with getDate function`,
            } as any);
        }

        if (businessDays && incrementedMonthOrYear) {
            if (retDate.getDay() === AbstractDateProvider.SATURDAY) {
                retDate.setDate(retDate.getDate() + 2);
            } else if (retDate.getDay() === AbstractDateProvider.SUNDAY) {
                retDate.setDate(retDate.getDate() + 1);
            }
        }

        return moment(retDate).format(formatString);
    }
}
