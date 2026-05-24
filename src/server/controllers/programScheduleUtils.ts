import { randomUUID } from "node:crypto";
import {
    Program,
    ProgramRecurrenceType,
    ProgramSchedule,
} from "../../shared/programs";

function normalizeSchedule(schedule: ProgramSchedule): ProgramSchedule {
    return {
        ...schedule,
        recurrenceType: schedule.recurrenceType ?? ProgramRecurrenceType.WEEKLY,
        isEnabled: schedule.isEnabled ?? true,
        nextScheduledRunTime: schedule.nextScheduledRunTime ?? null,
        daysOfWeek: schedule.daysOfWeek ? [...schedule.daysOfWeek] : schedule.daysOfWeek,
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
                    recurrenceType: ProgramRecurrenceType.WEEKLY,
                    startTime: program.startTime,
                    daysOfWeek: [...program.daysOfWeek],
                }),
            ],
        };
    }

    return {
        ...program,
        schedules: [],
    };
}
