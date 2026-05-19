import { Entity, Fields } from "remult";
import { SystemSettings, WeatherServiceSettings, SensorSettings, LCDSettings } from "../../shared/systemSettings";

@Entity("settings", {
    allowApiCrud: true
})
export class SystemSettingsDto implements SystemSettings {
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
    temperatureUnit: "F" | "C" = "F"; // F or C

    // F or C
    @Fields.string<SystemSettings>({
        validate: (setting) => {
            if (setting.measurementUnit !== "imperial" && setting.measurementUnit !== "metric") {
                console.error("measurementUnit must be either 'imperial' or 'metric'");
            }
        }
    })
    measurementUnit: "imperial" | "metric" = "imperial"; // imperial or metric

    // imperial or metric
    @Fields.string()
    weatherService: "weatherapi" | "openweathermap" = "weatherapi"; // weatherapi or openweathermap

    // openmateo or weatherapi
    @Fields.json()
    weatherServiceSettings: {
        'weatherapi'?: WeatherServiceSettings;
        'openweathermap'?: WeatherServiceSettings;
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

    // Voltage reference for the AtoD converter
    @Fields.number()
    analogDigitalAddress = 0x48; // I2C address for the LCD display

    // I2C address for the LCD display
    @Fields.json()
    sensors: SensorSettings[] = [];

    @Fields.number()
    historySnapshotInterval = 60; // Interval in seconds for saving system status snapshots

    // Interval in seconds for saving system status snapshots
    @Fields.json()
    lcdSettings: LCDSettings = {
        rows: 4,
        cols: 20,
        pageCycleTimeSeconds: 20, // Time in seconds to cycle through LCD pages
        i2cAddress: 0x48 // I2C address for the AtoD converter
    };
}
