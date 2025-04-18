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

    @Fields.string()
    activeZoneStart: string | null = null;

    @Fields.string()
    activeZoneEnd: string | null = null;

    @Fields.json()
    weatherData: WeatherData = {
      temperatureUnit: "F",
      measurementUnit: "imperial",
      latitude: 0,
      longitude: 0,
      timezone: "",
      current: {
        temperature: 0,
        precipitation: 0,
        isDay: 0,
        relativeHumidity: 0,
        cloudCover: 0,
        conditionCode: 0,
        conditionText: "",
        conditionIcon: "",
        windSpeed: 0,
        windDirection: 0,
        windGusts: 0
      },
      forecast: {
        today: {
          sunrise: null,
          sunset: null,
          moonrise: null,
          moonset: null,
          averageHumidity: 0,
          snowProbability: 0,
          temperatureHigh: 0,
          temperatureLow: 0,
          totalSnowfall: 0,
          totalPrecipitation: 0,
          precipitationProbability: 0,
          windAverage: 0,
          windGusts: 0,
          uvIndexMax: 0,
          conditionText: "",
          conditionIcon: "",
          conditionCode: 0
        },
        tomorrow: {
          sunrise: null,
          sunset: null,
          moonrise: null,
          moonset: null,
          averageHumidity: 0,
          snowProbability: 0,
          temperatureHigh: 0,
          temperatureLow: 0,
          totalSnowfall: 0,
          totalPrecipitation: 0,
          precipitationProbability: 0,
          windAverage: 0,
          windGusts: 0,
          uvIndexMax: 0,
          conditionText: "",
          conditionIcon: "",
          conditionCode: 0
        },
      },
      lastUpdated: null
    }

    @Fields.date()
    lastSchedulerRun?: Date;

    @Relations.toOne(() => Program, {
      defaultIncluded: true, 
    })
    activeProgram: Program | null = null

}

