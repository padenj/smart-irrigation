import { Gpio as RealGpio } from 'pigpio';
import { IRelayController } from '../types/hardware';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PINS = [5, 6, 12, 13];
interface IGpio {
    digitalWrite(value: 0 | 1): void;
}

class MockGpio implements IGpio {
    constructor(public pin: number, public options: { mode: number }) {
        console.log(`Mock GPIO initialized on pin ${pin} with options`, options);
    }

    digitalWrite(value: 0 | 1): void {
        console.log(`Mock GPIO pin ${this.pin} set to ${value}`);
    }

    public static OUTPUT = 1; // Mock OUTPUT mode
}

const Gpio = process.env.MOCK_HARDWARE === 'true' ? MockGpio : RealGpio;

class RelayController implements IRelayController {
    private static instance: RelayController;
    private relays: Map<number, IGpio> = new Map();

    private constructor(pins: number[]) {
        pins.forEach(pin => {
            const relay = new Gpio(pin, { mode: Gpio.OUTPUT });
            this.relays.set(pin, relay);
            relay.digitalWrite(1); // Ensure relay is off initially
        });
    }

    public static getInstance(): RelayController {
        if (!RelayController.instance) {
            RelayController.instance = new RelayController(PINS);
        }
        return RelayController.instance;
    }

    public turnOn(pin: number): void {
        const relay = this.relays.get(pin);
        if (!relay) {
            throw new Error(`Relay on pin ${pin} is not initialized`);
        }
        relay.digitalWrite(0); // Turn on the relay
    }

    public turnOff(pin: number): void {
        const relay = this.relays.get(pin);
        if (!relay) {
            console.error(`Relay on pin ${pin} is not initialized`);
            return;
        }
        relay.digitalWrite(1); // Turn off the relay
    }

    public dispose(): void {
        this.relays.forEach(relay => relay.digitalWrite(1)); // Turn off all relays
        this.relays.clear();
    }
}

export default RelayController.getInstance();