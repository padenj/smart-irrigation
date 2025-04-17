import { WeatherData } from '../../shared/weatherData';
import { ILCDManager } from '../types/hardware';
import { DateTimeUtils } from '../utilities/DateTimeUtils';


export class DisplayController {
    static setWeatherData(weatherData: WeatherData) {
        DisplayController.insertText(1, 0, 0, `Now: ${Math.round(weatherData.current.temperature)}${weatherData.temperatureUnit} ${weatherData.current.conditionText}`);
        DisplayController.insertText(1, 1, 0, `High: ${Math.round(weatherData.forecast.today.temperatureHigh)}${weatherData.temperatureUnit} Low: ${Math.round(weatherData.forecast.today.temperatureLow)}${weatherData.temperatureUnit}`);
        const formatTime = (time: string|null) => {
            if (!time) {
                return 'N/A';
            }
            const [hours, minutes, period] = time.match(/(\d+):(\d+)\s*(AM|PM)/i)!.slice(1);
            return `${parseInt(hours, 10)}:${minutes}${period.toLowerCase()}`;
        };
        DisplayController.insertText(1, 2, 0, `Sun: ${formatTime(weatherData.forecast.today.sunrise)}-${formatTime(weatherData.forecast.today.sunset)}`);
        DisplayController.insertText(1, 3, 0, `Prec: ${weatherData.current.precipitation}" Wind: ${Math.round(weatherData.current.windSpeed)}${weatherData.measurementUnit === 'metric' ? 'kph' : 'mph'}`);
    }

    static lcdManager: ILCDManager;

    static setTime(timezone: string) {
        DisplayController.insertText(0, 0, 0, DateTimeUtils.toDateTimeShortStr(new Date(), timezone));
    }

    static setActiveProgram(programName?: string) {
        if (!programName) {
            programName = 'None';
        }
        const programText = `Prog: ${programName.slice(0, 14)}`;
        DisplayController.writeLine(0, 1, programText);
    }

    static setActiveZone(zoneName?: string, duration?: number) {
        if (!zoneName) {
            zoneName = 'None';
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
