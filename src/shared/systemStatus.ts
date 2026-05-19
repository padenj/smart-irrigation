import { Entity, Fields } from "remult";

import { Zone } from "./zones.js";
import { Program } from "./programs.js";
import { WeatherData } from "./weatherData.js";

export interface SensorData {
  rawValue: number;
  convertedValue: number;
  unit: string;
  lastUpdated: string | null;
}

@Entity("systemStatusSnapshot", {
  allowApiCrud: true
})
export class SystemStatusSnapshot {
  @Fields.uuid()
  id!: string;

  @Fields.string()
  timestamp: string = '';

  @Fields.json()
  systemStatus: SystemStatus | null = null;
}

export interface SystemStatus {
  id: number;
  activeZone: Zone | null;
  activeZoneStart: string | null;
  activeZoneEnd: string | null;
  weatherData: WeatherData;
  lastSchedulerRun?: Date;
  activeProgram: Program | null;
  sensorData: {
    [key: string]: SensorData
  };
}


