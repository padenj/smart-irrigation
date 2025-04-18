import axios from 'axios';
import { remult } from 'remult';
import { SystemSettings } from '../../shared/systemSettings';
import { WeatherData, WeatherForecastData } from '../../shared/weatherData';

export async function fetchWeather(): Promise<WeatherData> {
    const settings = await remult.repo(SystemSettings).findFirst();
    if (!settings || !settings.weatherApiKey || !settings.latitude || !settings.longitude) {
        throw new Error('Missing required system settings for weather API');
    }

    const { weatherApiKey, latitude, longitude } = settings;

    const currentWeatherUrl = `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${latitude},${longitude}`;
    const forecastWeatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${latitude},${longitude}&days=2`;

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
                totalSnowfall: 0,
                precipitationProbability: 0,
                snowProbability: 0,
                averageHumidity: 0,
                windAverage: 0,
                uvIndexMax: 0,
                conditionText: '',
                conditionIcon: '',
                conditionCode: 0,
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
            totalSnowfall: settings.measurementUnit === 'imperial' ? data.day.totalsnow_cm / 2.54 : data.day.totalsnow_cm,
            precipitationProbability: data.day.daily_chance_of_rain,
            snowProbability: data.day.daily_chance_of_snow,
            averageHumidity: data.day.avghumidity,
            windAverage: settings.measurementUnit === 'imperial' ? data.day.maxwind_mph : data.day.maxwind_kph,
            uvIndexMax: data.day.uv,
            conditionText: data.day.condition.text,
            conditionIcon: resizeImage(data.day.condition.icon),
            conditionCode: data.day.condition.code,
        }
    }

    return {
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
            precipitation: settings.measurementUnit === 'imperial' ? currentData.current.precip_in : currentData.current.precip_mm,
            isDay: currentData.current.is_day,
            cloudCover: currentData.current.cloud,
            conditionCode: currentData.current.condition.code,
            conditionText: currentData.current.condition.text,
            conditionIcon: resizeImage(currentData.current.condition.icon),
            windDirection: currentData.current.wind_degree,
            windGusts: settings.measurementUnit === 'imperial' ? currentData.current.gust_mph : currentData.current.gust_kph,
        },
        forecast: {
            today: getWeatherForcastData(forecastData.forecast.forecastday[0]),
            tomorrow: getWeatherForcastData(forecastData.forecast.forecastday[1]),
        },
    };
}