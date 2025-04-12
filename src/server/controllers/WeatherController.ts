import { remult } from 'remult';
import { SystemSettings } from '../../shared/systemSettings';
import { SystemStatus } from '../../shared/systemStatus';
import { fetchWeather } from '../integrations/openmeteo';
import { DateTimeUtils } from '../utilities/DateTimeUtils';
import { DisplayController } from './DisplayController';

export class WeatherController {
    static async RetrieveWeather(): Promise<void> {
        const settingsRepo = remult.repo(SystemSettings);
        const statusRepo = remult.repo(SystemStatus);

        const settings = await settingsRepo.findFirst();
        if (!settings) {
            throw new Error('System settings not found');
        }

        if (settings.weatherService === 'openmateo') {
            const weatherData = await fetchWeather({ 
                latitude: parseFloat(settings.latitude),
                longitude: parseFloat(settings.longitude),
                timezone: settings.timezone,
                temperatureUnit: settings.temperatureUnit as 'F' | 'C'
            });

            if (!weatherData) {
                console.log('Failed to fetch weather data');
                return;
            }

            const systemStatus = await statusRepo.findFirst() || new SystemStatus();
            weatherData.lastUpdated = DateTimeUtils.toISODateTime(new Date(), settings.timezone);
            systemStatus.weatherData = weatherData;
            await statusRepo.save(systemStatus);
            DisplayController.setWeatherData(weatherData);
        } else {
            throw new Error(`Unsupported weather service ${settings.weatherService}`);
        }
    }
}