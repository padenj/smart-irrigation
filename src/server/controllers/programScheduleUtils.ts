import { randomUUID } from "node:crypto";
import {
    Program,
    ProgramRecurrenceType,
    ProgramSchedule,
} from "../../shared/programs";

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
                ? schedule.intervalDays ?? 1
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

    if (program.startTime && program.daysOfWeek && program.daysOfWeek.length > 0) {
        return {
            ...program,
            schedules: [
                normalizeSchedule({
                    id: randomUUID(),
                    startTime: program.startTime,
                    isEnabled: true,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [...program.daysOfWeek],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: program.nextScheduledRunTime ?? null,
                }),
            ],
        };
    }

    return {
        ...program,
        schedules: [],
    };
}
