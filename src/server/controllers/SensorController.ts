import { BackendMethod, remult } from 'remult';
import { SystemSettings } from '../../shared/systemSettings';
import { SystemStatus } from '../../shared/systemStatus';
import { IAtoDController } from '../types/hardware';
import { LogController } from './LogController';
import { DateTime } from 'luxon';
import { DisplayController } from './DisplayController';

export class SensorController {
    static atodController: IAtoDController;
    static initialized = false;

    static async initializeSensors(systemSettings: SystemSettings) {
        if (this.initialized || !this.atodController) {
            return;
        }
        await this.atodController.initialize(systemSettings);
        this.initialized = true;
    }

    @BackendMethod({ allowed: true, apiPrefix: 'sensors' })
    static async ReadSensorData(): Promise<void> {
        const systemSettingsRepo = remult.repo(SystemSettings);
        const systemStatusRepo = remult.repo(SystemStatus);
        const systemSettings = await systemSettingsRepo.findFirst();
        const systemStatus = await systemStatusRepo.findFirst();

        if (!systemSettings || !systemStatus) {
            throw new Error('System settings or status not found');
        }
        if (!systemStatus.sensorData) {
            systemStatus.sensorData = {};
        }

        // Remove sensorData for sensors that no longer exist in systemSettings.sensors
        const validSensorNames = new Set(systemSettings.sensors?.map(sensor => sensor.name));
        for (const sensorName of Object.keys(systemStatus.sensorData)) {
            if (!validSensorNames.has(sensorName)) {
                delete systemStatus.sensorData[sensorName];
            }
        }

        if (!systemSettings.sensors) {
            return;
        }   

        const referenceVoltage = systemSettings.sensorReferenceVoltage || 3.3; // Default to 3.3V if not set

        for (const sensor of systemSettings.sensors) {
            const sensorData = systemStatus.sensorData[sensor.name] || {
                rawValue: 0,
                convertedValue: 0,
                unit: '',
                lastUpdated: null,
            };

            const now = DateTime.now().setZone(systemSettings.timezone);
            if (
                sensorData.lastUpdated &&
                (now.toMillis() - DateTime.fromISO(sensorData.lastUpdated).toMillis()) / 1000 <
                    sensor.readFrequencySeconds
            ) {
                continue;
            }

            let rawValue: number;

            const readMethod = sensor.readMethod || 'single';

            if (readMethod === 'single') {
                try {
                    rawValue = await this.atodController.readSensorValue(sensor.analogPort);
                } catch (error) {
                    LogController.writeLog(`Error reading sensor value (single): ${error}`, "ERROR");
                    return;
                }
            } else if (readMethod === 'averageFive') {
                const readings: number[] = [];
                for (let i = 0; i < 5; i++) {
                    try {
                        readings.push(await this.atodController.readSensorValue(sensor.analogPort));
                    } catch (error) {
                        LogController.writeLog(`Error reading sensor value (averageFive, iteration ${i + 1}): ${error}`, "ERROR");
                        return;
                    }
                }

                const mean = readings.reduce((sum, value) => sum + value, 0) / readings.length;
                const threshold = mean * 0.2; // 20% deviation threshold

                const filteredReadings = readings.filter(
                    (value) => Math.abs(value - mean) <= threshold
                );

                if (filteredReadings.length === 0) {
                    console.log('All sensor readings were filtered out as outliers, using mean instead.');
                    LogController.writeLog(`All sensor readings were filtered out as outliers, using mean instead.`, "WARNING");
                    filteredReadings.push(mean);
                }

                rawValue =
                    filteredReadings.reduce((sum, value) => sum + value, 0) /
                    filteredReadings.length;
            } else {
                LogController.writeLog(`Unknown readMethod: ${readMethod}`, "ERROR");
                return;
            }
            let convertedValue: number;
            let unit: string;

            
            switch (sensor.readValueAs) {
                case 'raw':
                    convertedValue = rawValue;
                    unit = 'raw';
                    break;
                case 'voltage':
                    convertedValue = parseFloat(((rawValue / 32767) * referenceVoltage).toFixed(2)); // Assuming 5V reference
                    if (sensor.inverted) {
                        convertedValue = referenceVoltage - convertedValue; // Invert the voltage
                    }
                    unit = 'V';
                    break;
                case 'percent':
                    convertedValue = parseFloat(
                        (
                            ((rawValue - sensor.minAnalogValue) /
                                (sensor.maxAnalogValue - sensor.minAnalogValue)) *
                            100
                        ).toFixed(2)
                    );
                    if (sensor.inverted) {
                        convertedValue = 100 - convertedValue; // Invert the percentage
                    }
                    unit = '%';
                    break;
                default:
                    LogController.writeLog(`Unknown readValueAs type: ${sensor.readValueAs}`, "ERROR");
                    return;
            }

            systemStatus.sensorData[sensor.name] = {
                rawValue,
                convertedValue,
                unit,
                lastUpdated: now.toISO(),
            };
        }

        let sensorDataString = '';
        const sensorEntries = Object.entries(systemStatus.sensorData);
        sensorEntries.forEach(([name, data], index) => {
            const shortName = name.slice(0, 3).toUpperCase();
            const convertedValue = Math.round(data.convertedValue);
            sensorDataString += `${shortName} ${convertedValue}${data.unit}`;
            if (index < sensorEntries.length - 1) {
                sensorDataString += '|';
            }
        });

        DisplayController.writeLine(0, 3, sensorDataString);

        await systemStatusRepo.save(systemStatus);
    }
}