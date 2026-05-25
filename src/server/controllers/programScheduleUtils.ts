import { DateTime } from "luxon";
import {
    Program,
    ProgramRecurrenceType,
    ProgramSchedule,
} from "../../shared/programs";
import { DateTimeUtils } from "../utilities/DateTimeUtils";

function generateScheduleId(): string {
    return (
        globalThis.crypto?.randomUUID?.() ??
        `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
}

function normalizeSchedule(
    schedule: Partial<ProgramSchedule> & Pick<ProgramSchedule, "id">
): ProgramSchedule {
    const recurrenceType =
        schedule.recurrenceType ??
        (schedule.intervalDays != null
            ? ProgramRecurrenceType.EVERY_N_DAYS
            : ProgramRecurrenceType.DAYS_OF_WEEK);

    return {
        id: schedule.id,
        startTime: schedule.startTime ?? "",
        isEnabled: schedule.isEnabled ?? true,
        recurrenceType,
        daysOfWeek:
            recurrenceType === ProgramRecurrenceType.DAYS_OF_WEEK
                ? [...(schedule.daysOfWeek ?? [])]
                : [],
        intervalDays:
            recurrenceType === ProgramRecurrenceType.EVERY_N_DAYS
                ? schedule.intervalDays ?? 2
                : null,
        lastScheduledRunTime: schedule.lastScheduledRunTime ?? null,
        nextScheduledRunTime: schedule.nextScheduledRunTime ?? null,
    };
}

export function normalizeProgramSchedules(program: Program): Program {
    const existingSchedules = program.schedules ?? [];

    if (existingSchedules.length > 0) {
        return {
            ...program,
            schedules: existingSchedules.map(normalizeSchedule),
        };
    }

    return {
        ...program,
        schedules: [
            normalizeSchedule({
                id: generateScheduleId(),
                startTime: program.startTime ?? "06:00",
                isEnabled: true,
                recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                daysOfWeek: [...(program.daysOfWeek ?? [])],
                intervalDays: null,
                lastScheduledRunTime: null,
                nextScheduledRunTime: program.nextScheduledRunTime ?? null,
            }),
        ],
    };
}

function parseStartTime(startTime: string): { hours: number; minutes: number } | null {
    const [hours, minutes] = startTime.split(":").map(Number);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    return { hours, minutes };
}

function calculateNextDaysOfWeekRun(
    schedule: ProgramSchedule,
    timezone: string,
    skipToday?: boolean,
    afterDate?: Date | null
): string | null {
    if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0) {
        return null;
    }

    const timeParts = parseStartTime(schedule.startTime);
    if (!timeParts) {
        return null;
    }

    const { hours, minutes } = timeParts;
    const now = DateTime.now().setZone(timezone);
    const sortedDaysOfWeek = [...schedule.daysOfWeek].sort((a, b) => a - b);
    let candidateDate = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
    const afterDateTime = afterDate
        ? DateTime.fromJSDate(afterDate).setZone(timezone)
        : null;

    for (let i = 0; i < 7 * 52; i++) {
        const currentDayOfWeek = candidateDate.weekday % 7;
        if (
            sortedDaysOfWeek.includes(currentDayOfWeek) &&
            (!skipToday || i > 0) &&
            candidateDate >= now &&
            (!afterDateTime || candidateDate > afterDateTime)
        ) {
            return DateTimeUtils.toISODateTime(candidateDate.toJSDate(), timezone);
        }

        candidateDate = candidateDate.plus({ days: 1 });
    }

    return null;
}

function calculateNextEveryNDaysRun(
    schedule: ProgramSchedule,
    timezone: string,
    skipToday?: boolean,
    afterDate?: Date | null
): string | null {
    const intervalDays = schedule.intervalDays ?? 1;
    if (intervalDays <= 0) {
        return null;
    }

    const timeParts = parseStartTime(schedule.startTime);
    if (!timeParts) {
        return null;
    }

    const { hours, minutes } = timeParts;
    const now = DateTime.now().setZone(timezone);
    const afterDateTime = afterDate
        ? DateTime.fromJSDate(afterDate).setZone(timezone)
        : null;
    const lastScheduledRunDate = DateTimeUtils.fromISODateTime(
        schedule.lastScheduledRunTime,
        timezone
    );

    let candidateDate = lastScheduledRunDate
        ? DateTime.fromJSDate(lastScheduledRunDate)
              .setZone(timezone)
              .plus({ days: intervalDays })
              .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 })
        : now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

    for (let i = 0; i < 366; i++) {
        const shouldSkipForToday = skipToday && candidateDate.hasSame(now, "day");
        if (
            !shouldSkipForToday &&
            candidateDate >= now &&
            (!afterDateTime || candidateDate > afterDateTime)
        ) {
            return DateTimeUtils.toISODateTime(candidateDate.toJSDate(), timezone);
        }

        candidateDate = candidateDate.plus({ days: intervalDays });
    }

    return null;
}

export function calculateScheduleNextScheduledRunTime(
    schedule: ProgramSchedule,
    timezone: string,
    skipToday?: boolean,
    skipUntil?: string | null
): string | null {
    if (!schedule.isEnabled || !schedule.startTime) {
        return null;
    }

    const afterDate = skipUntil
        ? DateTimeUtils.fromISODateTime(skipUntil, timezone)
        : null;

    if (schedule.recurrenceType === ProgramRecurrenceType.EVERY_N_DAYS) {
        return calculateNextEveryNDaysRun(schedule, timezone, skipToday, afterDate);
    }

    return calculateNextDaysOfWeekRun(schedule, timezone, skipToday, afterDate);
}

export function calculateProgramSchedules(
    program: Program,
    timezone: string,
    skipToday?: boolean
): Program {
    const normalizedProgram = normalizeProgramSchedules(program);
    const schedules = normalizedProgram.schedules.map((schedule) => ({
        ...schedule,
        nextScheduledRunTime: calculateScheduleNextScheduledRunTime(
            schedule,
            timezone,
            skipToday,
            normalizedProgram.skipUntil
        ),
    }));

    const nextScheduledRunTime = schedules
        .filter((schedule) => schedule.isEnabled && schedule.nextScheduledRunTime)
        .sort((left, right) => {
            const leftTime = Date.parse(left.nextScheduledRunTime ?? "");
            const rightTime = Date.parse(right.nextScheduledRunTime ?? "");
            return leftTime - rightTime;
        })[0]?.nextScheduledRunTime ?? null;

    return {
        ...normalizedProgram,
        schedules,
        nextScheduledRunTime,
    };
}
