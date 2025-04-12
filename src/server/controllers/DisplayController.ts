import { WeatherData } from '../../shared/weatherData';
import { ILCDManager } from '../types/hardware';
import { DateTimeUtils } from '../utilities/DateTimeUtils';


export class DisplayController {
    static setWeatherData(weatherData: WeatherData) {
        DisplayController.insertText(1, 0, 0, `Current: ${Math.round(weatherData.current.temperature)}°${weatherData.temperatureUnit}`);
        DisplayController.insertText(1, 1, 0, `High: ${Math.round(weatherData.forecast.temperature2mMax)}°${weatherData.temperatureUnit} Low: ${Math.round(weatherData.forecast.temperature2mMin)}°${weatherData.temperatureUnit}`);
        DisplayController.insertText(1, 2, 0, `${weatherData.current.weatherCodeText}`);
        DisplayController.insertText(1, 3, 0, `Precipitation: ${weatherData.current.precipitation}`);
    }

    static lcdManager: ILCDManager;

    static setTime(timezone: string) {
        DisplayController.insertText(0, 0, 0, DateTimeUtils.toDateTimeShortStr(new Date(), timezone));
    }

    static setActiveProgram(programName?: string) {
        if (!programName) {
            programName = 'None Active';
        }
        const programText = `Program: ${programName.slice(0, 15)}`;
        DisplayController.insertText(0, 1, 0, programText);
    }

    static setActiveZone(zoneName?: string, duration?: number) {
        if (!zoneName) {
            zoneName = 'None Active';
        }
        const zoneText = `Zone: ${zoneName.slice(0, 10)} ${duration ? `(${duration}s)` : ''}`;
        DisplayController.insertText(0, 2, 0, zoneText);
    }

    static async writeLine(pageIndex: number, lineIndex: number, text: string) {
        if (this.lcdManager) {
            this.lcdManager.writeLine(pageIndex, lineIndex, text);
        } else {
            console.error('LCD Manager is not initialized');
        }
    }
    static async insertText(pageIndex: number, lineIndex: number, position: number, text: string) {
        if (this.lcdManager) {
            this.lcdManager.insertText(pageIndex, lineIndex, position, text);
        } else {
            console.error('LCD Manager is not initialized');
        }
    }
}
