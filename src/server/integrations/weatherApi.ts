import axios from 'axios';
import { remult } from 'remult';
import { SystemSettings } from '../../shared/systemSettings';
import { WeatherData } from '../../shared/weatherData';

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
            conditionIcon: currentData.current.condition.icon,
            windDirection: currentData.current.wind_degree,
            windGusts: settings.measurementUnit === 'imperial' ? currentData.current.gust_mph : currentData.current.gust_kph,
        },
        forecast: {
            today: {
                sunrise: forecastData.forecast.forecastday[0].astro.sunrise,
                sunset: forecastData.forecast.forecastday[0].astro.sunset,
                moonrise: forecastData.forecast.forecastday[0].astro.moonrise,
                moonset: forecastData.forecast.forecastday[0].astro.moonset,
                temperatureHigh: settings.temperatureUnit === 'F' ? forecastData.forecast.forecastday[0].day.maxtemp_f : forecastData.forecast.forecastday[0].day.maxtemp_c,
                temperatureLow: settings.temperatureUnit === 'F' ? forecastData.forecast.forecastday[0].day.mintemp_f : forecastData.forecast.forecastday[0].day.mintemp_c,
                windGusts: settings.measurementUnit === 'imperial' ? forecastData.forecast.forecastday[0].day.maxwind_mph : forecastData.forecast.forecastday[0].day.maxwind_kph,
                totalPrecipitation: settings.measurementUnit === 'imperial' ? forecastData.forecast.forecastday[0].day.totalprecip_in : forecastData.forecast.forecastday[0].day.totalprecip_mm,
                totalSnowfall: settings.measurementUnit === 'imperial' ? forecastData.forecast.forecastday[0].day.totalsnow_cm / 2.54 : forecastData.forecast.forecastday[0].day.totalsnow_cm,
                precipitationProbability: forecastData.forecast.forecastday[0].day.daily_chance_of_rain,
                showProbability: forecastData.forecast.forecastday[0].day.daily_chance_of_snow,
                averageHumidity: forecastData.forecast.forecastday[0].day.avghumidity,
                windAverage: settings.measurementUnit === 'imperial' ? forecastData.forecast.forecastday[0].day.maxwind_mph : forecastData.forecast.forecastday[0].day.maxwind_kph,
                windDirection: forecastData.forecast.forecastday[0].day.maxwind_degree,
                uvIndexMax: forecastData.forecast.forecastday[0].day.uv,
                conditionText: forecastData.forecast.forecastday[0].day.condition.text,
                conditionIcon: forecastData.forecast.forecastday[0].day.condition.icon,
                conditionCode: forecastData.forecast.forecastday[0].day.condition.code,
            },
            tomorrow: {
                sunrise: forecastData.forecast.forecastday[1].astro.sunrise,
                sunset: forecastData.forecast.forecastday[1].astro.sunset,
                moonrise: forecastData.forecast.forecastday[1].astro.moonrise,
                moonset: forecastData.forecast.forecastday[1].astro.moonset,
                temperatureHigh: settings.temperatureUnit === 'F' ? forecastData.forecast.forecastday[1].day.maxtemp_f : forecastData.forecast.forecastday[1].day.maxtemp_c,
                temperatureLow: settings.temperatureUnit === 'F' ? forecastData.forecast.forecastday[1].day.mintemp_f : forecastData.forecast.forecastday[1].day.mintemp_c,
                windGusts: settings.measurementUnit === 'imperial' ? forecastData.forecast.forecastday[1].day.maxwind_mph : forecastData.forecast.forecastday[1].day.maxwind_kph,
                totalPrecipitation: settings.measurementUnit === 'imperial' ? forecastData.forecast.forecastday[1].day.totalprecip_in : forecastData.forecast.forecastday[1].day.totalprecip_mm,
                totalSnowfall: settings.measurementUnit === 'imperial' ? forecastData.forecast.forecastday[1].day.totalsnow_cm / 2.54 : forecastData.forecast.forecastday[1].day.totalsnow_cm,
                precipitationProbability: forecastData.forecast.forecastday[1].day.daily_chance_of_rain,
                showProbability: forecastData.forecast.forecastday[1].day.daily_chance_of_snow,
                averageHumidity: forecastData.forecast.forecastday[1].day.avghumidity,
                windAverage: settings.measurementUnit === 'imperial' ? forecastData.forecast.forecastday[1].day.maxwind_mph : forecastData.forecast.forecastday[1].day.maxwind_kph,
                windDirection: forecastData.forecast.forecastday[1].day.maxwind_degree,
                uvIndexMax: forecastData.forecast.forecastday[1].day.uv,
                conditionText: forecastData.forecast.forecastday[1].day.condition.text,
                conditionIcon: forecastData.forecast.forecastday[1].day.condition.icon,
                conditionCode: forecastData.forecast.forecastday[1].day.condition.code,
            }
        },
    };
}