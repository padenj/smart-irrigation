import { Entity, Fields } from "remult";

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

    @Fields.string<SystemSettings>({
        validate: (setting) => {
            if (setting.weatherService !== "openmateo" && setting.weatherService !== "weatherapi") {
                console.error("weatherService must be either 'openmateo' or 'weatherapi'");
            }
        }
    })
    weatherService = "weatherapi"; // openmateo or weatherapi

    @Fields.string()
    weatherApiKey = "";

    @Fields.string()
    weatherLocation = ""; // City name or coordinates (lat, lon);

    @Fields.number()
    weatherUpdateInterval = 15; // Interval in minutes for weather updates
    
    @Fields.number()
    moistureSensorAddress = 0x48; // I2C address for the moisture sensor

    @Fields.string()
    moistureSensorReadingInterval = "5"; // Interval in minutes for reading moisture sensor

    @Fields.number()
    moistureSensorCalibration = 0; // Calibration value for the moisture sensor

    @Fields.number()
    lcdAddress = 0x27; // I2C address for the LCD display


}