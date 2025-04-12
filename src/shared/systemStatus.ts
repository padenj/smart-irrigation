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
        relativeHumidity2m: 0,
        cloudCover: 0,
        weatherCode: 0,
        weatherCodeText: "",
        windSpeed10m: 0,
        windDirection10m: 0,
        windGusts10m: 0,
        pressureMsl: 0,
        surfacePressure: 0,
        apparentTemperature: 0
      },
      forecast: {
        sunrise: null,
        sunset: null,
        temperature2mMax: 0,
        temperature2mMin: 0,
        rainSum: 0,
        showersSum: 0,
        snowfallSum: 0,
        precipitationSum: 0,
        precipitationHours: 0,
        precipitationProbabilityMax: 0,
        windSpeed10mMax: 0,
        windGusts10mMax: 0,
        windDirection10mDominant: 0,
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

