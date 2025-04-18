import { DateTime } from 'luxon';


export class DateTimeUtils {
    static toISODateTime(date: Date|null, timezone: string | null): string | null {
        if (!date) return null;
        return DateTime.fromJSDate(date).setZone(timezone || 'UTC').toISO();
    }

    static fromISODateTime(dateString: string | null, timezone: string | null): Date | null {
        if (!dateString) return null;
        const dateTime = DateTime.fromISO(dateString, { zone: timezone || 'UTC' });
        return dateTime.toJSDate();
    }

    static toReadableDateTime(date: Date|null, timezone: string | null): string {
        if (!date) return '';
        const dateTime = DateTime.fromJSDate(date).setZone(timezone || 'UTC');
        return dateTime.toFormat('yyyy-MM-dd hh:mm a ZZZ');
    }

    static isoToDateTimeShortStr(dateString: string | null, timezone: string | null): string {
        if (!dateString) return '';
        const dateTime = DateTime.fromISO(dateString, { zone: timezone || 'UTC' });
        return dateTime.toFormat('MM/dd/yy hh:mm a');
    }

    static isoToTimeShortStr(dateString: string | null, timezone: string | null): string {
        if (!dateString) return '';
        const dateTime = DateTime.fromISO(dateString, { zone: timezone || 'UTC' });
        return dateTime.toFormat('h:mma');
    }

    static isoToTimeShortMed(dateString: string | null, timezone: string | null): string {
        if (!dateString) return '';
        const dateTime = DateTime.fromISO(dateString, { zone: timezone || 'UTC' });
        return dateTime.toFormat('h:mm:ss a');
    }

    static toDateTimeShortStr(date: Date|null, timezone: string | null): string {
        if (!date) return '';
        const dateTime = DateTime.fromJSDate(date).setZone(timezone || 'UTC');
        return dateTime.toFormat('MM/dd/yy hh:mm a');
    }
}
