import { Entity, Fields, Relations } from "remult";

import { Zone } from "./zones.js";
import { Program } from "./programs.js";
import { WeatherData } from "./weatherData.js";

@Entity("systemStatus", {
  allowApiCrud: true
})
export class SystemStatus {
    @Fields.number()
    id: number = 0;

    @Relations.toOne(() => Zone, {
      defaultIncluded: true, 
    }) 
    activeZone: Zone | null = null

    @Fields.date()
    activeZoneStarted?: Date = undefined;

    @Fields.date()
    activeZoneEnd?: Date = undefined;

    @Fields.json()
    weatherData: WeatherData = {
      latitude: 0,
      longitude: 0,
      timezone: "",
      current: {
        temperature: 0,
        precipitation: 0,
        rain: 0,
        showers: 0,
        snowfall: 0,
        isDay: 0,
        relativeHumidity: 0,
        cloudCover: 0,
        conditionCode: 0,
        conditionText: "",
        windSpeed: 0,
        windDirection: 0,
        windGusts: 0,
        pressureMsl: 0,
        surfacePressure: 0,
        apparentTemperature: 0
      },
      forecast: {
        sunrise: null,
        sunset: null,
        temperatureHigh: 0,
        temperatureLow: 0,
        rainSum: 0,
        showersSum: 0,
        totalSnowfall: 0,
        totalPrecipitatoin: 0,
        precipitationHours: 0,
        precipitationProbability: 0,
        windAverage: 0,
        windGusts: 0,
        windDirection: 0,
        uvIndexMax: 0
      },
      lastUpdated: null,
      temperatureUnit: "F"
    }

    @Fields.date()
    lastSchedulerRun?: Date;

    @Relations.toOne(() => Program, {
      defaultIncluded: true, 
    })
    activeProgram: Program | null = null

}

