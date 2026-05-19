import type { SystemSettings } from '../../shared/systemSettings';
import dotenv from 'dotenv';
import { IAtoDController } from '../types/hardware';
import { i2cMutex } from './i2cLock';
dotenv.config({ path: '.env.local' });

type I2cBusLike = {
    close(): Promise<void>;
};

type Ads1115Like = {
    measure(channel: string): Promise<number>;
};

class ADS1115Wrapper implements IAtoDController {
    private static instance: ADS1115Wrapper | null = null;
    private bus: I2cBusLike | null = null;
    private ads1115: Ads1115Like | null = null;
    private isMocked: boolean;
    private calibrationValue: number = 0;

    private constructor() {
        this.isMocked = process.env.MOCK_HARDWARE === 'true';
    }

    public static async getInstance(): Promise<ADS1115Wrapper> {
        if (!ADS1115Wrapper.instance) {
            ADS1115Wrapper.instance = new ADS1115Wrapper();
        }
        return ADS1115Wrapper.instance;
    }

    private createMockAds1115(): Ads1115Like {
        return {
            measure: async (channel: string) => {
                console.log(`Mock measure called for channel: ${channel}`);
                return Math.floor(Math.random() * 32001);
            },
        };
    }

    public async initialize(settings: SystemSettings) {
        if (this.isMocked) {
            this.ads1115 = this.createMockAds1115();
        } else {
            try {
                const [{ openPromisified }, { default: ADS1115 }] = await Promise.all([
                    import('i2c-bus'),
                    import('ads1115'),
                ]);
                const busNumber = 1; // Default I2C bus number
                await i2cMutex.runExclusive(async () => {
                    this.bus = await openPromisified(busNumber);
                    const address = settings ? settings.analogDigitalAddress : 0x48; // Default address // Retrieve address from Settings
                    this.ads1115 = await ADS1115(this.bus, address);
                    console.log(`ADS1115 initialized at address ${address}`);
                });
            } catch (error) {
                console.error('Error initializing ADS1115, falling back to mock hardware:', error);
                this.isMocked = true;
                this.ads1115 = this.createMockAds1115();
            }
        }
    }

    public async readSensorValue(sensorIndex: number): Promise<number> {
        if (!this.ads1115) {
            throw new Error('ADS1115 is not initialized');
        }

        return await i2cMutex.runExclusive(async () => {
            const channel = `${sensorIndex}+GND`;
            const rawValue = await this.ads1115.measure(channel);
            return rawValue + this.calibrationValue;
        });
    }

    public async dispose() {
        if (this.bus) {
            await i2cMutex.runExclusive(async () => {
                await this.bus!.close();
                this.bus = null;
            });
        }
        ADS1115Wrapper.instance = null;
    }
}

export default await ADS1115Wrapper.getInstance(); // Initialize the instance
// Example usage
// (async () => {
//     const adsWrapper = await ADS1115Wrapper.getInstance();
//     try {
//         const sensorValue = await adsWrapper.readSensorValue(0);
//         console.log(`Sensor Value: ${sensorValue}`);
//     } finally {
//         await adsWrapper.dispose();
//     }
// })();
