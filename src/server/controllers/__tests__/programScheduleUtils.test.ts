import { describe, expect, it, vi } from "vitest";
import {
    Program,
    ProgramRecurrenceType,
    ProgramSchedule,
} from "../../../shared/programs";
import { normalizeProgramSchedules } from "../programScheduleUtils";

vi.mock("node:crypto", () => ({
    randomUUID: vi.fn(() => "generated-schedule-id"),
}));

describe("normalizeProgramSchedules", () => {
    it("migrates legacy startTime and daysOfWeek into one enabled daysOfWeek schedule", () => {
        const program: Program = {
            id: "program-1",
            name: "Legacy Program",
            startTime: "06:30",
            endTime: "",
            daysOfWeek: [1, 3, 5],
            schedules: [],
            zones: [{ zoneId: "zone-1", duration: 15 }],
            isEnabled: true,
            nextScheduledRunTime: "2026-05-24T06:30:00.000Z",
            lastRunTime: null,
            skipUntil: null,
            conditions: [],
        };

        const normalizedProgram = normalizeProgramSchedules(program);

        expect(normalizedProgram.schedules).toEqual([
            {
                id: "generated-schedule-id",
                recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                startTime: "06:30",
                isEnabled: true,
                daysOfWeek: [1, 3, 5],
                intervalDays: null,
                lastScheduledRunTime: null,
                nextScheduledRunTime: "2026-05-24T06:30:00.000Z",
            },
        ]);
        expect(normalizedProgram.startTime).toBe("06:30");
        expect(normalizedProgram.daysOfWeek).toEqual([1, 3, 5]);
    });

    it("preserves existing schedules while applying recurrence-specific defaults", () => {
        const schedules: ProgramSchedule[] = [
            {
                id: "schedule-1",
                recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                startTime: "07:00",
                daysOfWeek: [2, 4],
                isEnabled: true,
                intervalDays: null,
                lastScheduledRunTime: null,
                nextScheduledRunTime: null,
            },
            {
                id: "schedule-2",
                recurrenceType: ProgramRecurrenceType.EVERY_N_DAYS,
                startTime: "08:00",
                isEnabled: false,
                daysOfWeek: [],
                intervalDays: 3,
                lastScheduledRunTime: null,
                nextScheduledRunTime: null,
            },
        ];

        const program: Program = {
            id: "program-2",
            name: "Scheduled Program",
            startTime: "06:30",
            endTime: "",
            daysOfWeek: [1, 3, 5],
            schedules,
            zones: [{ zoneId: "zone-1", duration: 15 }],
            isEnabled: true,
            nextScheduledRunTime: null,
            lastRunTime: null,
            skipUntil: null,
            conditions: [],
        };

        const normalizedProgram = normalizeProgramSchedules(program);

        expect(normalizedProgram.schedules).toEqual([
            {
                id: "schedule-1",
                recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                startTime: "07:00",
                isEnabled: true,
                daysOfWeek: [2, 4],
                intervalDays: null,
                lastScheduledRunTime: null,
                nextScheduledRunTime: null,
            },
            {
                id: "schedule-2",
                recurrenceType: ProgramRecurrenceType.EVERY_N_DAYS,
                startTime: "08:00",
                isEnabled: false,
                daysOfWeek: [],
                intervalDays: 3,
                lastScheduledRunTime: null,
                nextScheduledRunTime: null,
            },
        ]);
    });
});
