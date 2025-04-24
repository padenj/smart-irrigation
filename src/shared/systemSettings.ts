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

@Entity("settings", {
    allowApiCrud: true
})
export class SystemSettings {
    @Fields.number()
    id: number = 0;

    @Fields.string()
    timezone = "America/Denver";

    @Fields.string()
    latitude = "39.9205"; // Latitude for weather API

    @Fields.string()
    longitude = "-105.0867"; // Longitude for weather API

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

    @Fields.string()
    weatherApiKey = "";

    @Fields.string()
    weatherLocation = ""; // City name or coordinates (lat, lon);

    @Fields.number()
    weatherUpdateInterval = 15; // Interval in minutes for weather updates

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
    analogDigitalAddress = 0x48; // I2C address for the AtoD converter

    @Fields.number()
    sensorReferenceVoltage = 3.3; // Voltage reference for the AtoD converter

    @Fields.number()
    lcdAddress = 0x27; // I2C address for the LCD display

    @Fields.json()
    sensors: SensorSettings[] = [];

}