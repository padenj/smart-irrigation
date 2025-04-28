import { Entity, Fields } from "remult";

export interface WeatherServiceSettings {
    apiKey: string;
    location: string;
    updateInterval: number;
    data?: unknown;
}

export interface SensorSettings {
    name: string
    sensorType: 'moisture' | 'temperature' | 'humidity',
    analogPort: number,
    minAnalogValue: number 
    maxAnalogValue: number,
    readValueAs: 'raw' | 'voltage' | 'percent',
    readFrequencySeconds: number,
    readMethod: 'single' | 'averageFive'
    inverted: boolean,
}

export interface LCDSettings {
    rows: number;
    cols: number;
    pageCycleTimeSeconds: number; // Time in milliseconds to cycle through LCD pages
    i2cAddress: number; // I2C address for the AtoD converter
}

@Entity("settings", {
    allowApiCrud: true
})
export class SystemSettings {
    @Fields.number()
    id: number = 0;

    @Fields.string()
    timezone = "America/Denver";

    @Fields.string<SystemSettings>({
        validate: (setting) => {
            if (setting.temperatureUnit !== "F" && setting.temperatureUnit !== "C") {
                console.error("temperatureUnit must be either 'F' or 'C'");
            }
        }
    })
    temperatureUnit = "F"; // F or C

    @Fields.string<SystemSettings>({
        validate: (setting) => {
            if (setting.measurementUnit !== "imperial" && setting.measurementUnit !== "metric") {
                console.error("measurementUnit must be either 'imperial' or 'metric'");
            }
        }
    })
    measurementUnit = "imperial"; // imperial or metric

    @Fields.string()
    weatherService = "weatherapi"; // openmateo or weatherapi

    @Fields.json()
    weatherServiceSettings: {
        'weatherapi'?: WeatherServiceSettings,
        'openweathermap'?: WeatherServiceSettings
    } = {
        weatherapi: {
            apiKey: "",
            location: "",
            updateInterval: 15
        },
        openweathermap: {
            apiKey: "",
            location: "",
            updateInterval: 15
        }
    };
    

    @Fields.number()
    sensorReferenceVoltage = 3.3; // Voltage reference for the AtoD converter

    @Fields.number()
    analogDigitalAddress = 0x48; // I2C address for the LCD display

    @Fields.json()
    sensors: SensorSettings[] = [];

    @Fields.number()
    historySnapshotInterval = 60; // Interval in seconds for saving system status snapshots

    @Fields.json()
    lcdSettings: LCDSettings = {
        rows: 4,
        cols: 20,
        pageCycleTimeSeconds: 20, // Time in seconds to cycle through LCD pages
        i2cAddress: 0x48 // I2C address for the AtoD converter
    };
}