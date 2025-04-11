import { Entity, Fields, Relations } from "remult";

import { Zone } from "./zones.js";
import { Program } from "./programs.js";

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
        temperatureF: 0,
        humidity: 0,
        isRaining: false,
        precipitation: 0,
        forecast: "",
        lastWeatherUpdate: undefined
    }

    @Fields.date()
    lastSchedulerRun?: Date;

    @Relations.toOne(() => Program, {
      defaultIncluded: true, 
    })
    activeProgram: Program | null = null

}

export interface WeatherData {
  temperatureF: number;
  humidity: number;
  isRaining: boolean;
  precipitation: number; // mm
  forecast: string;
  lastWeatherUpdate?: Date;
}
