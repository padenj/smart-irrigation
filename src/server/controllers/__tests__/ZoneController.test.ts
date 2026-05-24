import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidPorts } from '../../../shared/zones';

const settingsRepoMock = {
    findFirst: vi.fn(),
};

const repoMock = vi.fn();
const systemStatusRepoMock = {
    findFirst: vi.fn(),
    update: vi.fn(),
};

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

vi.mock('../SystemController', () => ({
    systemStatusRepo: systemStatusRepoMock,
}));

vi.mock('../DisplayController', () => ({
    DisplayController: {
        setActiveZone: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../LogController', () => ({
    LogController: {
        writeLog: vi.fn().mockResolvedValue(undefined),
        writeEvent: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('ZoneController.reconcileRelayState', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        repoMock.mockReset();
        repoMock.mockImplementation(() => settingsRepoMock);
        settingsRepoMock.findFirst.mockResolvedValue({ timezone: 'America/Denver' });
        systemStatusRepoMock.update.mockResolvedValue(undefined);
    });

    it('reapplies the expected active relay state', async () => {
        const activePort = 5;
        systemStatusRepoMock.findFirst.mockResolvedValue({
            activeZone: { id: 'zone-1', name: 'Front Flowers', gpioPort: activePort },
            activeZoneEnd: new Date(Date.now() + 60_000).toISOString(),
        });

        const { ZoneController } = await import('../ZoneController');
        const relays = {
            turnOn: vi.fn(),
            turnOff: vi.fn(),
            dispose: vi.fn(),
        };
        ZoneController.relays = relays;

        await ZoneController.reconcileRelayState();

        expect(relays.turnOn).toHaveBeenCalledWith(activePort);
        const turnedOffPins = relays.turnOff.mock.calls.map(([pin]) => pin);
        expect(turnedOffPins).toHaveLength(ValidPorts.length - 1);
        expect(turnedOffPins).not.toContain(activePort);
        for (const pin of ValidPorts) {
            if (pin !== activePort) {
                expect(turnedOffPins).toContain(pin);
            }
        }
    });
});
