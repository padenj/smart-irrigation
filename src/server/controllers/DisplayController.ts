import { WeatherData } from '../../shared/weatherData';
import { ILCDManager } from '../types/hardware';
import { DateTimeUtils } from '../utilities/DateTimeUtils';


export class DisplayController {
    static setWeatherData(weatherData: WeatherData) {
        DisplayController.insertText(1, 0, 0, `Now: ${Math.round(weatherData.current.temperature)}${weatherData.temperatureUnit} ${weatherData.current.weatherCodeText}`);
        DisplayController.insertText(1, 1, 0, `High: ${Math.round(weatherData.forecast.temperature2mMax)}${weatherData.temperatureUnit} Low: ${Math.round(weatherData.forecast.temperature2mMin)}${weatherData.temperatureUnit}`);
        DisplayController.insertText(1, 2, 0, `Sun: ${DateTimeUtils.isoToTimeShortStr(weatherData.forecast.sunrise, weatherData.timezone)} - ${DateTimeUtils.isoToTimeShortStr(weatherData.forecast.sunset, weatherData.timezone)}`);
        DisplayController.insertText(1, 3, 0, `Prec: ${weatherData.current.precipitation}in Wind: ${Math.round(weatherData.current.windSpeed10m)}mph`);
    }

    static lcdManager: ILCDManager;

    static setTime(timezone: string) {
        DisplayController.insertText(0, 0, 0, DateTimeUtils.toDateTimeShortStr(new Date(), timezone));
    }

    static setActiveProgram(programName?: string) {
        if (!programName) {
            programName = 'None Active';
        }
        const programText = `Prog: ${programName.slice(0, 14)}`;
        DisplayController.writeLine(0, 1, programText);
    }

    static setActiveZone(zoneName?: string, duration?: number) {
        if (!zoneName) {
            zoneName = 'None Active';
        }
        const zoneText = `Zone: ${zoneName.slice(0, 10).padEnd(10, ' ')} ${duration ? `${duration}s` : ''}`;
        DisplayController.writeLine(0, 2, zoneText);
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
