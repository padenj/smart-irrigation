import { beforeEach, describe, expect, it, vi } from 'vitest';

const systemStatusRepoMock = {
    findFirst: vi.fn(),
    update: vi.fn(),
};

const settingsRepoMock = {
    findFirst: vi.fn(),
};

const repoMock = vi.fn();

vi.mock('remult', () => {
    const makeDecorator = () => () => {};
    const relationDecorator = () => () => {};
    const BackendMethod = () => (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => descriptor;
    const Fields = {
        uuid: makeDecorator,
        string: makeDecorator,
        json: makeDecorator,
        boolean: makeDecorator,
        number: makeDecorator,
        date: makeDecorator,
        object: makeDecorator,
    };

    return {
        repo: (...args: unknown[]) => repoMock(...args),
        BackendMethod,
        Entity: () => () => {},
        Fields,
        Relations: {
            toOne: relationDecorator,
        },
        Validators: {
            required: () => true,
        },
        default: { Fields },
    };
});

vi.mock('../DisplayController', () => ({
    DisplayController: {
        setTime: vi.fn(),
        initialize: vi.fn(),
        setActiveZone: vi.fn(),
    },
}));

vi.mock('../WeatherController', () => ({
    WeatherController: {
        RetrieveWeather: vi.fn(),
    },
}));

vi.mock('../ProgramController', () => ({
    ProgramController: {
        runNextScheduledProgram: vi.fn(),
        recalculateAllSchedules: vi.fn(),
    },
}));

vi.mock('../ZoneController', () => ({
    ZoneController: {
        reconcileRelayState: vi.fn(),
        stopAllZones: vi.fn(),
    },
}));

vi.mock('../SensorController', () => ({
    SensorController: {
        ReadSensorData: vi.fn(),
        initializeSensors: vi.fn(),
    },
}));

vi.mock('../HistoryController', () => ({
    HistoryController: {
        saveSnapshot: vi.fn(),
    },
}));

vi.mock('../LogController', () => ({
    LogController: {
        writeLog: vi.fn(),
        writeEvent: vi.fn(),
    },
}));

describe('SystemController.run', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        repoMock.mockReset();
        repoMock
            .mockImplementationOnce(() => systemStatusRepoMock)
            .mockImplementation(() => settingsRepoMock);

        settingsRepoMock.findFirst.mockResolvedValue({ timezone: 'America/Denver' });
        systemStatusRepoMock.findFirst.mockResolvedValue({
            id: 0,
            activeZone: { id: 'zone-1' },
            activeProgram: { id: 'program-1' },
        });
        systemStatusRepoMock.update.mockResolvedValue(undefined);
    });

    it('updates only lastSchedulerRun in the heartbeat patch', async () => {
        const { SystemController } = await import('../SystemController');

        await SystemController.run();

        expect(systemStatusRepoMock.update).toHaveBeenCalledTimes(1);
        expect(systemStatusRepoMock.update).toHaveBeenCalledWith(
            0,
            expect.objectContaining({ lastSchedulerRun: expect.any(Date) })
        );

        const updatePatch = systemStatusRepoMock.update.mock.calls[0][1];
        expect(updatePatch).not.toHaveProperty('activeZone');
        expect(updatePatch).not.toHaveProperty('activeProgram');
    });
});
