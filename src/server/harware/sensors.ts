import { openPromisified, PromisifiedBus } from 'i2c-bus';
import ADS1115 from 'ads1115';
import { remult } from 'remult';
import { SystemSettings } from '../../shared/systemSettings';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

class ADS1115Wrapper {
    private static instance: ADS1115Wrapper | null = null;
    private bus: PromisifiedBus | null = null;
    private ads1115: any = null;
    private isMocked: boolean;
    private calibrationValue: number = 0;
    private settingsRepo = remult.repo(SystemSettings);

    private constructor() {
        this.isMocked = process.env.MOCK_HARDWARE === 'true';
    }

    public static async getInstance(): Promise<ADS1115Wrapper> {
        if (!ADS1115Wrapper.instance) {
            ADS1115Wrapper.instance = new ADS1115Wrapper();
            await ADS1115Wrapper.instance.initialize();
        }
        return ADS1115Wrapper.instance;
    }

    private async initialize() {
        if (this.isMocked) {
            this.ads1115 = {
                measure: async (channel: string) => {
                    console.log(`Mock measure called for channel: ${channel}`);
                    return 1000; // Mock value
                },
            };
        } else {
            const busNumber = 1; // Default I2C bus number
            this.bus = await openPromisified(busNumber);
            const settings = await this.settingsRepo.findFirst();
            const address = settings ? settings.moistureSensorAddress : 0x48; // Default address // Retrieve address from Settings
            this.ads1115 = await ADS1115(this.bus, address);
            this.calibrationValue = settings ? settings.moistureSensorCalibration : 0; // Retrieve calibration value from Settings
        }
    }

    public async readSensorValue(sensorIndex: number): Promise<number> {
        if (!this.ads1115) {
            throw new Error('ADS1115 is not initialized');
        }

        const channel = `${sensorIndex}+GND`;
        const rawValue = await this.ads1115.measure(channel);

        return rawValue + this.calibrationValue;
    }

    public async dispose() {
        if (this.bus) {
            await this.bus.close();
            this.bus = null;
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

