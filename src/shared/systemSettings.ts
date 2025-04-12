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

    @Fields.string()
    temperatureUnit = "F"; // F or C

    @Fields.string()
    weatherService = "openmateo" // openweathermap or weatherapi

    @Fields.string()
    weatherApiKey = "";

    @Fields.string()
    weatherLocation = ""; // City name or coordinates (lat, lon);

    @Fields.number()
    weatherUpdateInterval = 60; // Interval in minutes for weather updates
    
    @Fields.number()
    moistureSensorAddress = 0x48; // I2C address for the moisture sensor

    @Fields.string()
    moistureSensorReadingInterval = "5"; // Interval in minutes for reading moisture sensor

    @Fields.number()
    moistureSensorCalibration = 0; // Calibration value for the moisture sensor

    @Fields.number()
    lcdAddress = 0x27; // I2C address for the LCD display


}