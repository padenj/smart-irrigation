import { Entity, Fields, Relations } from "remult";

import { Zone } from "./zones.js";;

@Entity("systemStatus")
export class SystemStatus {
    @Relations.toOne(() => Zone) 
    activeZone!: Zone

    @Fields.date()
    startTime!: Date;

    @Fields.date()
    endTime!: Date;

    @Fields.json()
    weatherData!: WeatherData

    @Fields.boolean()
    operational!: boolean

    @Fields.date()
    lastUpdate!: Date;
}

export interface WeatherData {
  temperatureF: number;
  humidity: number;
  isRaining: boolean;
  precipitation: number; // mm
  forecast: string;
}
