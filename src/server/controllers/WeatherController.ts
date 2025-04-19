import { remult } from 'remult';
import { SystemSettings } from '../../shared/systemSettings';
import { SystemStatus } from '../../shared/systemStatus';
import { fetchWeather as fetchOpenWeatherMapApi } from '../integrations/openWeatherMap';
import { fetchWeather as fetchWeatherApi } from '../integrations/weatherApi';
import { DateTimeUtils } from '../utilities/DateTimeUtils';
import { DisplayController } from './DisplayController';
import { WeatherData } from '../../shared/weatherData';

export class WeatherController {
    static async RetrieveWeather(forceUpdate: boolean): Promise<void> {
        const settingsRepo = remult.repo(SystemSettings);
        const statusRepo = remult.repo(SystemStatus);

        const settings = await settingsRepo.findFirst();
        if (!settings) {
            throw new Error('System settings not found');
        }


        const systemStatus = await statusRepo.findFirst() || new SystemStatus();
        if (!forceUpdate && systemStatus.weatherData?.lastUpdated && systemStatus.weatherData.service === settings.weatherService) {
            const lastUpdated = DateTimeUtils.fromISODateTime(systemStatus.weatherData.lastUpdated, settings.timezone);
            if (!lastUpdated) {
            console.log('Last updated time is invalid');
            return;
            }
            const now = new Date();
            const minutesSinceLastUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

            if (minutesSinceLastUpdate < settings.weatherUpdateInterval) {
            console.log('Weather update not required');
            return;
            }
        }

        let weatherData: WeatherData | null = null;

        if (settings.weatherService === 'openweathermap') {
            weatherData = await fetchOpenWeatherMapApi();

            if (!weatherData) {
                console.log('Failed to fetch OpenWeatherMap data');
                return;
            }


        } else if (settings.weatherService === "weatherapi") {
            weatherData = await fetchWeatherApi();
            if (!weatherData) {
                console.log('Failed to fetch WeatherAPI data');
                return;
            }
        } else {
            throw new Error(`Unsupported weather service ${settings.weatherService}`);
        }

        if (!weatherData) {
            console.log('Weather data is null');
            return;
        }
        
        weatherData.lastUpdated = DateTimeUtils.toISODateTime(new Date(), settings.timezone);
        systemStatus.weatherData = weatherData;
        await statusRepo.save(systemStatus);
        DisplayController.setWeatherData(weatherData);
    }
}