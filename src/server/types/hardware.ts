import { LCDSettings, SystemSettings } from "../../shared/systemSettings";

export interface IRelayController {
    turnOn(pin: number): void;
    turnOff(pin: number): void;
    dispose(): void;
}

export interface ILCDManager {
    initialize(settings: LCDSettings): Promise<void>;
    writeLine(lineIndex: number, text: string): void;
    isMocked: boolean;
}

export interface IAtoDController {
    initialize(settings: SystemSettings): Promise<void>;
    readSensorValue(sensorIndex: number): Promise<number>;
    dispose(): void;
}