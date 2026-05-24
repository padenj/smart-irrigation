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
    it("migrates legacy startTime and daysOfWeek into one enabled weekly schedule", () => {
        const program: Program = {
            id: "program-1",
            name: "Legacy Program",
            startTime: "06:30",
            endTime: "",
            daysOfWeek: [1, 3, 5],
            schedules: [],
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
                id: "generated-schedule-id",
                recurrenceType: ProgramRecurrenceType.WEEKLY,
                startTime: "06:30",
                daysOfWeek: [1, 3, 5],
                isEnabled: true,
                nextScheduledRunTime: null,
            },
        ]);
        expect(normalizedProgram.startTime).toBe("06:30");
        expect(normalizedProgram.daysOfWeek).toEqual([1, 3, 5]);
    });

    it("preserves existing schedules while applying missing defaults", () => {
        const schedules: ProgramSchedule[] = [
            {
                id: "schedule-1",
                recurrenceType: ProgramRecurrenceType.WEEKLY,
                startTime: "07:00",
                daysOfWeek: [2, 4],
            },
            {
                id: "schedule-2",
                recurrenceType: ProgramRecurrenceType.WEEKLY,
                startTime: "08:00",
                daysOfWeek: [6],
                isEnabled: false,
                nextScheduledRunTime: "2026-05-24T08:00:00.000Z",
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
                recurrenceType: ProgramRecurrenceType.WEEKLY,
                startTime: "07:00",
                daysOfWeek: [2, 4],
                isEnabled: true,
                nextScheduledRunTime: null,
            },
            {
                id: "schedule-2",
                recurrenceType: ProgramRecurrenceType.WEEKLY,
                startTime: "08:00",
                daysOfWeek: [6],
                isEnabled: false,
                nextScheduledRunTime: "2026-05-24T08:00:00.000Z",
            },
        ]);
    });
});
