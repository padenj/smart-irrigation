import { remult } from 'remult';
import { LCDSettings, SystemSettings } from '../../shared/systemSettings';
import { WeatherData } from '../../shared/weatherData';
import { ILCDManager } from '../types/hardware';
import { DateTimeUtils } from '../utilities/DateTimeUtils';
import { LcdPage } from '../../shared/lcdPages';

export class DisplayController {
    private static initialized = false;
    static lcdManager: ILCDManager;
    static pageRepository = remult.repo(LcdPage);
    static settingsRepository = remult.repo(SystemSettings);
    static currentSettings: LCDSettings | null = null;
    static currentPageIndex: number = 0;
    private static _intervalInstance: NodeJS.Timeout | undefined;
    private static _currentCycleTime: number | undefined;

    public static async initialize() {
        if (this.initialized || !this.lcdManager) {
            console.error('DisplayController is already initialized or LCD Manager is not set');
            return;
        }

        const settings = await this.settingsRepository.findFirst();

        if (!settings) {
            console.error('System settings not found, cannot initialize LCD');
            return;
        }

        if (!settings.lcdSettings) {
            settings.lcdSettings = {
                rows: 4,
                cols: 20,
                pageCycleTimeSeconds: 20000, // Default to 20 seconds
                i2cAddress: 0x27 // Default I2C address
            };
            await this.settingsRepository.save(settings);
        }

        this.currentSettings = settings.lcdSettings;

        await this.lcdManager.initialize(settings.lcdSettings);
        this.initialized = true;

        this.startCyclingPages();
    }
    
    static async setWeatherData(weatherData: WeatherData) {
        await DisplayController.writeLine(1, 0, `Now: ${Math.round(weatherData.current.temperature)}${weatherData.temperatureUnit} ${weatherData.current.conditionText}`);
        await DisplayController.writeLine(1, 1, `High: ${Math.round(weatherData.forecast.today.temperatureHigh)}${weatherData.temperatureUnit} Low: ${Math.round(weatherData.forecast.today.temperatureLow)}${weatherData.temperatureUnit}`);
        const formatTime = (time: string|null) => {
            if (!time) {
                return 'N/A';
            }
            //console.log(`Time: ${time}`);
            const [hours, minutes, period] = time.match(/(\d+):(\d+)\s*(AM|PM)/i)!.slice(1);
            return `${parseInt(hours, 10)}:${minutes}${period.toLowerCase()}`;
        };
        await DisplayController.writeLine(1, 2, `Sun: ${formatTime(weatherData.forecast.today.sunrise)}-${formatTime(weatherData.forecast.today.sunset)}`);
        await DisplayController.writeLine(1, 3, `Prec: ${weatherData.current.precipitation}" Wind: ${Math.round(weatherData.current.windSpeed)}${weatherData.measurementUnit === 'metric' ? 'kph' : 'mph'}`);
    }


    static async setTime(timezone: string) {
        await DisplayController.writeLine(0, 0, DateTimeUtils.toDateTimeShortStr(new Date(), timezone));
    }

    static async setActiveProgram(programName?: string) {
        if (!programName) {
            programName = 'None';
        }
        const programText = `Prog: ${programName.slice(0, 14)}`;
        await DisplayController.writeLine(0, 1, programText);
    }

    static async setActiveZone(zoneName?: string, duration?: number) {
        if (!zoneName) {
            zoneName = 'None';
        }
        const zoneText = `Zone: ${zoneName.slice(0, 10).padEnd(10, ' ')} ${duration ? `${duration}s` : ''}`;
        await DisplayController.writeLine(0, 2, zoneText);
    }

    static async loadPage(pageNumber: number) {
        // Get current LCDSettings from settings repository
        const settings = await this.settingsRepository.findFirst();
        if (!settings || !settings.lcdSettings) {
            console.error('System settings or LCD settings not found');
            return;
        }

        const lcdSettings = settings.lcdSettings;

        // Compare lcdSettings to this.currentSettings. If anything changed, reinitialize the LCD.
        const settingsChanged = JSON.stringify(lcdSettings) !== JSON.stringify(this.currentSettings);
        if (settingsChanged) {
            console.log('LCD settings changed, reinitializing LCD');
            await this.lcdManager.initialize(lcdSettings);
            this.currentSettings = { ...lcdSettings };
        }

        if (this.lcdManager) {
            const page = await this.pageRepository.findFirst({ pageNumber });
            if (page) {
                for (let lineIndex = 0; lineIndex < lcdSettings.rows; lineIndex++) {
                    const lineText = page.lines[lineIndex] || '';
                    await this.lcdManager.writeLine(lineIndex, lineText);
                }
                if (this.lcdManager.isMocked) {
                    console.log('Cycling to page:', pageNumber, page.lines);
                }
            } else {
                console.error(`Page with index ${pageNumber} not found`);
            }
        } else {
            console.error('LCD Manager is not initialized');
        }
    }

    static async writeLine(pageIndex: number, lineIndex: number, text: string) {
        if (!this.currentSettings) {
            console.error('LCD settings not initialized');
            return;
        }
        if (lineIndex >= this.currentSettings.rows) {
            return;
        }
        let page = await this.pageRepository.findFirst({ pageNumber: pageIndex });
        if (!page) {
            page = this.pageRepository.create({
                pageNumber: pageIndex,
                lines: []
            });
        }
        while (page.lines.length < this.currentSettings.rows) {
            page.lines.push(' '.repeat(this.currentSettings.cols));
        }
        page.lines[lineIndex] = text.padEnd(this.currentSettings.cols, ' ').slice(0, this.currentSettings.cols);
        // Upsert: update if exists, otherwise create
        const existingPage = await this.pageRepository.findFirst({ pageNumber: page.pageNumber });
        if (existingPage) {
            existingPage.lines = page.lines;
            await this.pageRepository.save(existingPage);
        } else {
            await this.pageRepository.save(page);
        }
       
        // Write to the LCD immediately if the current page is showing
        if (this.currentPageIndex === pageIndex) {
            if (this.lcdManager) {
                await this.lcdManager.writeLine(lineIndex, page.lines[lineIndex]);
            } else {
                console.error('LCD Manager is not initialized, cannot write line');
            }
        }
    }

    static async insertText(pageIndex: number, lineIndex: number, position: number, text: string) {
        if (!this.currentSettings) {
            console.error('LCD settings not initialized');
            return;
        }
        let page = await this.pageRepository.findFirst({ pageNumber: pageIndex });
        let lineText: string;
        if (!page || !page.lines[lineIndex]) {
            lineText = ' '.repeat(this.currentSettings.cols);
        } else {
            lineText = page.lines[lineIndex];
        }
        const before = lineText.slice(0, position);
        const after = lineText.slice(position + text.length);
        const newLine = (before + text + after).padEnd(this.currentSettings.cols, ' ').slice(0, this.currentSettings.cols);
        await this.writeLine(pageIndex, lineIndex, newLine);
    }

    static async startCyclingPages() {
        if (!this.currentSettings) {
            console.error('LCD settings not initialized');
            return;
        }

        if (!this.lcdManager) {
            console.error('LCD Manager is not initialized, cannot start cycling pages');
            return;
        }

        // Load the first page
        await this.loadPage(0);
        this.currentPageIndex = 0;

        // Start cycling through pages
        this._currentCycleTime = this.currentSettings.pageCycleTimeSeconds ?? 0;
        this._intervalInstance = setInterval(async () => {
            // If pageCycleTime has changed, clear and restart the interval
            if (this._intervalInstance && (this.currentSettings?.pageCycleTimeSeconds ?? 0) !== this._currentCycleTime) {
                console.log(`Page cycle time changed, restarting interval with ${this.currentSettings?.pageCycleTimeSeconds}s`);
                clearInterval(this._intervalInstance);
                this._intervalInstance = undefined;
                this._currentCycleTime = this.currentSettings?.pageCycleTimeSeconds ?? 0;
                // Restart cycling with new interval
                this.startCyclingPages();
                return;
            }
            // Get the maximum page number from the database
            const pages = await this.pageRepository.find({ orderBy: { pageNumber: "desc" }, limit: 1 });
            const maxPageNumber = pages.length > 0 ? pages[0].pageNumber : 0;
            const pageCount = maxPageNumber + 1;

            if (!this.currentSettings) {
                console.error('LCD settings not initialized');
                return;
            }

            //console.log(`pageCount: ${pageCount}, currentPageIndex: ${this.currentPageIndex}`);
            const nextPageIndex = (this.currentPageIndex + 1) >= pageCount ? 0 : this.currentPageIndex + 1;
            await this.loadPage(nextPageIndex);
            this.currentPageIndex = nextPageIndex;
        }, this.currentSettings.pageCycleTimeSeconds * 1000);
    }
}
