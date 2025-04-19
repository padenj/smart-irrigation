import axios from 'axios';
import { remult } from 'remult';
import { SystemSettings } from '../../shared/systemSettings';
import { WeatherData, WeatherForecastData } from '../../shared/weatherData';
import { LogController } from '../controllers/LogController';

export async function fetchWeather(): Promise<WeatherData|null> {
    const settings = await remult.repo(SystemSettings).findFirst();
    if (!settings) {
        console.log('Missing required system settings for weather API');
        LogController.writeLog('Missing required system settings for weather API', 'WARNING');
        return null;
    }

    if (!settings.weatherServiceSettings) {
        settings.weatherServiceSettings = {}
    }

    if (!settings.weatherServiceSettings['weatherapi']) {
        settings.weatherServiceSettings['weatherapi'] = {
            apiKey: settings.weatherApiKey,
            location: `${settings.latitude}, ${settings.longitude}`,
            updateInterval: settings.weatherUpdateInterval
        };
        await remult.repo(SystemSettings).save(settings);
    }

    const { apiKey, location } = settings.weatherServiceSettings['weatherapi'];

    if (!apiKey) {
        console.error('Missing WeatherAPI API key');
        LogController.writeLog('Missing WeatherAPI API key', 'ERROR');
        return null;
    }
    if (!location) {
        console.error('Missing WeatherAPI location');
        LogController.writeLog('Missing WeatherAPI location', 'ERROR');
        return null;
    }

    const currentWeatherUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${location}`;
    const forecastWeatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${location}&days=2`;

    const [currentResponse, forecastResponse] = await Promise.all([
        axios.get(currentWeatherUrl),
        axios.get(forecastWeatherUrl),
    ]);

    const currentData = currentResponse.data;
    const forecastData = forecastResponse.data;

    const resizeImage = (url: string) => {
        return url.replace('64x64', '128x128');
    }

    const getWeatherForcastData = (data: any): WeatherForecastData => {
        if (!data) {
            return {
                sunrise: '',
                sunset: '',
                moonrise: '',
                moonset: '',
                temperatureHigh: 0,
                temperatureLow: 0,
                windGusts: 0,
                totalPrecipitation: 0,
                totalSnow: 0,
                totalRain: 0,
                precipitationProbability: 0,
                rainProbability: 0,
                snowProbability: 0,
                averageHumidity: 0,
                windAverage: 0,
                uvIndexMax: 0,
                conditionText: '',
                conditionIcon: '',
                conditionCode: 0,
                asOf: null,
            };
        }
        return {
            sunrise: data.astro.sunrise,
            sunset: data.astro.sunset,
            moonrise: data.astro.moonrise,
            moonset: data.astro.moonset,
            temperatureHigh: settings.temperatureUnit === 'F' ? data.day.maxtemp_f : data.day.maxtemp_c,
            temperatureLow: settings.temperatureUnit === 'F' ? data.day.mintemp_f : data.day.mintemp_c,
            windGusts: settings.measurementUnit === 'imperial' ? data.day.maxwind_mph : data.day.maxwind_kph,
            totalPrecipitation: settings.measurementUnit === 'imperial' ? data.day.totalprecip_in : data.day.totalprecip_mm,
            totalRain: settings.measurementUnit === 'imperial' ? data.day.totalprecip_in : data.day.totalprecip_mm,
            totalSnow: settings.measurementUnit === 'imperial' ? data.day.totalsnow_cm / 2.54 : data.day.totalsnow_cm,
            precipitationProbability: data.day.daily_chance_of_rain,
            rainProbability: data.day.daily_chance_of_rain,
            snowProbability: data.day.daily_chance_of_snow,
            averageHumidity: data.day.avghumidity,
            windAverage: settings.measurementUnit === 'imperial' ? data.day.maxwind_mph : data.day.maxwind_kph,
            uvIndexMax: data.day.uv,
            conditionText: data.day.condition.text,
            conditionIcon: resizeImage(data.day.condition.icon),
            conditionCode: data.day.condition.code,
            asOf: data.date,
        }
    }

    return {
        service: 'weatherapi',
        temperatureUnit: settings.temperatureUnit === 'F' ? 'F' : 'C',
        measurementUnit: settings.measurementUnit === 'imperial' ? 'imperial' : 'metric',
        latitude: currentData.location.lat,
        longitude: currentData.location.lon,
        timezone: currentData.location.tz_id,
        lastUpdated: currentData.current.last_updated,
        current: {
            temperature: settings.temperatureUnit === 'F' ? currentData.current.temp_f : currentData.current.temp_c,
            relativeHumidity: currentData.current.humidity,
            windSpeed: settings.measurementUnit === 'imperial' ? currentData.current.wind_mph : currentData.current.wind_kph,
            precipitation: settings.measurementUnit === 'imperial' ? currentData.current.precip_in  : currentData.current.precip_mm ,
            rain: settings.measurementUnit === 'imperial' ? currentData.current.precip_in : currentData.current.precip_mm,
            snow: 0,
            isDay: currentData.current.is_day,
            cloudCover: currentData.current.cloud,
            conditionCode: currentData.current.condition.code,
            conditionText: currentData.current.condition.text,
            conditionIcon: resizeImage(currentData.current.condition.icon),
            windDirection: currentData.current.wind_degree,
            windGusts: settings.measurementUnit === 'imperial' ? currentData.current.gust_mph : currentData.current.gust_kph,
            asOf: currentData.current.last_updated,
        },
        forecast: {
            today: getWeatherForcastData(forecastData.forecast.forecastday[0]),
            tomorrow: getWeatherForcastData(forecastData.forecast.forecastday[1]),
        },
    };
}