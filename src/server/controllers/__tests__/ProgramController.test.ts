import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgramController } from '../ProgramController';
import { Program, ProgramRecurrenceType } from '../../../shared/programs';
import { programRepository } from '../../data/repositories';

vi.mock('../ZoneController', () => ({
    ZoneController: {
        runZone: vi.fn(),
        runZoneBlocking: vi.fn(),
        stopZone: vi.fn(),
    },
}));

vi.mock('../LogController', () => ({
    LogController: {
        writeLog: vi.fn(),
        writeEvent: vi.fn(),
    },
}));
vi.mock('../DisplayController', () => ({
    DisplayController: {
        setActiveProgram: vi.fn(),
    },
}));

vi.mock('../../data/repositories', () => ({
    programRepository: {
        findId: vi.fn(),
        find: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
    },
    systemStatusRepository: {
        findId: vi.fn(),
        find: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
    },
    settingsRepository: {
        findId: vi.fn(),
        find: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
    },
}));


vi.mock('../utilities/DateTimeUtils', async () => {
    const actual = await vi.importActual<typeof import('../../utilities/DateTimeUtils')>('../utilities/DateTimeUtils');
    return {
        ...actual,
        toISODateTime: (date: Date | null) => {
            if (!date) return null;
            // Always return ISO string in UTC for test predictability
            return date.toISOString();
        },
        fromISODateTime: (iso: string) => {
            return iso ? new Date(iso) : null;
        },
    };
});

vi.mock('remult', () => {
    const makeDecorator = () => (_target: any, _propertyKey: string | symbol) => {};
    const fieldsMock = {
        uuid: makeDecorator,
        string: makeDecorator,
        json: makeDecorator,
        boolean: makeDecorator,
        object: makeDecorator,
    };

    // BackendMethod should return a decorator that does nothing
    const BackendMethod = () => (_target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
        if (descriptor && descriptor.value) {
            descriptor.value.key = 'dummyKey';
        }
        return descriptor;
    };

    return {
        repo: vi.fn(() => ({
            findFirst: vi.fn(async () => ({ timezone: 'UTC' })),
            findId: vi.fn(),
            update: vi.fn(),
            find: vi.fn(),
        })),
        BackendMethod,
        Entity: () => {},
        Fields: fieldsMock,
        default: { Fields: fieldsMock },
    };
});

describe('ProgramController.calculateNextScheuleDate', () => {
    const baseProgram: Program = {
        id: '1',
        name: 'Test Program',
        zones: [{ zoneId: 'zone1', duration: 10 }],
        daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
        schedules: [],
        startTime: '12:00',
        isEnabled: true,
        conditions: [],
        lastRunTime: null,
        nextScheduledRunTime: null,
        skipUntil: null,
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-05T10:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns null if program has no zones', async () => {
        const program = { ...baseProgram, zones: [] };
        const result = await ProgramController.calculateNextScheuleDate(program);
        expect(result).toBeNull();
    });

    it('returns null if program has no daysOfWeek', async () => {
        const program = { ...baseProgram, daysOfWeek: [] };
        const result = await ProgramController.calculateNextScheuleDate(program);
        expect(result).toBeNull();
    });

    it('returns next run date as today if today is in daysOfWeek and skipToday is false and the start time has not yet passed', async () => {
        // Set today to Monday (1)
        const now = new Date();
        const today = now.getUTCDay(); // 0 (Sun) - 6 (Sat)
        const daysOfWeek = [today];
        const program = { ...baseProgram, daysOfWeek, startTime: '23:59' };
        const result = await ProgramController.calculateNextScheuleDate(program, false);
        expect(result).toMatch(/T23:59:00.000Z$/);
    });    
    
    it('returns next run date as tomorrow if today is in daysOfWeek and skipToday is false but the start time has passed', async () => {
        // Set up so that the start time is earlier than now (already passed today)
        const now = new Date();
        const today = now.getUTCDay(); // 0 (Sun) - 6 (Sat)
        const daysOfWeek = [today, (today + 1) % 7]; // Today and tomorrow (wrap to 0 if end of week)
        const startTime = '09:59';
        const program = { ...baseProgram, daysOfWeek, startTime };
        const result = await ProgramController.calculateNextScheuleDate(program, false);
        // Should be tomorrow at the same startTime
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(now.getUTCDate() + 1);
        const expectedDateStr = tomorrow.toISOString().slice(0, 10) + `T${startTime}:00.000Z`;
        expect(result).toBe(expectedDateStr);
    });

    it('skips today if skipToday is true', async () => {
        // Set today to Monday (1)
        const now = new Date();
        const today = now.getUTCDay();
        const nextDay = (today + 2) % 7;
        const daysOfWeek = [today, nextDay];
        const program = { ...baseProgram, daysOfWeek, startTime: '00:01' };
        const result = await ProgramController.calculateNextScheuleDate(program, true);
        // Should not be today
        const todayStr = now.toISOString().slice(0, 10);
        expect(result?.startsWith(todayStr)).toBe(false);
    });

    it('returns null if no valid next run date is found', async () => {
        // daysOfWeek is empty, so no valid date
        const program = { ...baseProgram, daysOfWeek: [] };
        const result = await ProgramController.calculateNextScheuleDate(program);
        expect(result).toBeNull();
    });

    it('respects skipUntil (afterDate) and finds next date after it', async () => {
        const now = new Date();
        const skipUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
        const daysOfWeek = [(now.getUTCDay() + 4) % 7]; // 4 days from now
        const program = {
            ...baseProgram,
            daysOfWeek,
            startTime: '12:00',
            skipUntil: skipUntil.toISOString(),
        };
        const result = await ProgramController.calculateNextScheuleDate(program);
        const resultDate = result ? new Date(result) : null;
        expect(resultDate && resultDate > skipUntil).toBe(true);
    });

    it('returns next run date after lastRunTime', async () => {
        const now = new Date();
        const lastRunTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // yesterday
        const daysOfWeek = [(now.getUTCDay() + 1) % 7];
        const program = {
            ...baseProgram,
            daysOfWeek,
            startTime: '12:00',
            lastRunTime,
        };
        const result = await ProgramController.calculateNextScheuleDate(program);
        expect(result).toBeTruthy();
        const resultDate = result ? new Date(result) : null;
        expect(resultDate && resultDate > new Date(lastRunTime)).toBe(true);
    });

    it('returns the earliest enabled schedule entry as the program summary next run', async () => {
        const today = new Date().getUTCDay();
        const program = {
            ...baseProgram,
            daysOfWeek: [],
            startTime: '',
            schedules: [
                {
                    id: 'schedule-later',
                    startTime: '09:00',
                    isEnabled: true,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [(today + 3) % 7],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: null,
                },
                {
                    id: 'schedule-earlier',
                    startTime: '06:30',
                    isEnabled: true,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [(today + 1) % 7],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: null,
                },
            ],
        } as Program;

        const result = await ProgramController.calculateNextScheuleDate(program);

        expect(result).toBe('2026-01-06T06:30:00.000Z');
    });

    it('ignores disabled schedule entries when computing the program summary next run', async () => {
        const today = new Date().getUTCDay();
        const program = {
            ...baseProgram,
            daysOfWeek: [],
            startTime: '',
            schedules: [
                {
                    id: 'schedule-disabled-earlier',
                    startTime: '06:30',
                    isEnabled: false,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [(today + 1) % 7],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: null,
                },
                {
                    id: 'schedule-enabled-later',
                    startTime: '05:00',
                    isEnabled: true,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [(today + 3) % 7],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: null,
                },
            ],
        } as Program;

        const result = await ProgramController.calculateNextScheuleDate(program);

        expect(result).toBe('2026-01-08T05:00:00.000Z');
    });
});

describe('ProgramController.updateProgramSchedule', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-05T10:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('persists schedule entry next runs and the earliest enabled summary next run', async () => {
        vi.mocked(programRepository.findId).mockResolvedValue({
            id: 'program-with-schedules',
            name: 'Program with schedules',
            zones: [{ zoneId: 'zone-1', duration: 10 }],
            daysOfWeek: [],
            startTime: '',
            schedules: [
                {
                    id: 'schedule-disabled-earlier',
                    startTime: '06:30',
                    isEnabled: false,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [2],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: null,
                },
                {
                    id: 'schedule-enabled-earliest',
                    startTime: '07:45',
                    isEnabled: true,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [2],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: null,
                },
                {
                    id: 'schedule-enabled-later',
                    startTime: '05:00',
                    isEnabled: true,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [4],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: null,
                },
            ],
            isEnabled: true,
            nextScheduledRunTime: null,
            lastRunTime: null,
            skipUntil: null,
            conditions: [],
        } as Program);

        await ProgramController.updateProgramSchedule('program-with-schedules');

        expect(programRepository.update).toHaveBeenCalledWith('program-with-schedules', {
            schedules: [
                {
                    id: 'schedule-disabled-earlier',
                    startTime: '06:30',
                    isEnabled: false,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [2],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: null,
                },
                {
                    id: 'schedule-enabled-earliest',
                    startTime: '07:45',
                    isEnabled: true,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [2],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: '2026-01-06T07:45:00.000Z',
                },
                {
                    id: 'schedule-enabled-later',
                    startTime: '05:00',
                    isEnabled: true,
                    recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
                    daysOfWeek: [4],
                    intervalDays: null,
                    lastScheduledRunTime: null,
                    nextScheduledRunTime: '2026-01-08T05:00:00.000Z',
                },
            ],
            nextScheduledRunTime: '2026-01-06T07:45:00.000Z',
        });
    });
});