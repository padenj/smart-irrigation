import { SystemSettings } from '../../shared/systemSettings';
import { WeatherData } from '../../shared/weatherData';
import { ILCDManager } from '../types/hardware';
import { DateTimeUtils } from '../utilities/DateTimeUtils';


export class DisplayController {
    private static initialized = false;
    static lcdManager: ILCDManager;

    public static async initialize(settings: SystemSettings) {
        if (this.initialized || !this.lcdManager) {
            return;
        }

        await this.lcdManager.initialize(settings);
        this.initialized = true;
    }
    
    static setWeatherData(weatherData: WeatherData) {
        DisplayController.writeLine(1, 0, `Now: ${Math.round(weatherData.current.temperature)}${weatherData.temperatureUnit} ${weatherData.current.conditionText}`);
        DisplayController.writeLine(1, 1, `High: ${Math.round(weatherData.forecast.today.temperatureHigh)}${weatherData.temperatureUnit} Low: ${Math.round(weatherData.forecast.today.temperatureLow)}${weatherData.temperatureUnit}`);
        const formatTime = (time: string|null) => {
            if (!time) {
                return 'N/A';
            }
            console.log(`Time: ${time}`);
            const [hours, minutes, period] = time.match(/(\d+):(\d+)\s*(AM|PM)/i)!.slice(1);
            return `${parseInt(hours, 10)}:${minutes}${period.toLowerCase()}`;
        };
        DisplayController.writeLine(1, 2, `Sun: ${formatTime(weatherData.forecast.today.sunrise)}-${formatTime(weatherData.forecast.today.sunset)}`);
        DisplayController.writeLine(1, 3, `Prec: ${weatherData.current.precipitation}" Wind: ${Math.round(weatherData.current.windSpeed)}${weatherData.measurementUnit === 'metric' ? 'kph' : 'mph'}`);
    }


    static setTime(timezone: string) {
        DisplayController.writeLine(0, 0, DateTimeUtils.toDateTimeShortStr(new Date(), timezone));
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
