import axios from 'axios';
import { remult } from 'remult';
import { SystemSettings, WeatherServiceSettings } from '../../shared/systemSettings';
import { WeatherCurrentData, WeatherData, WeatherForecastData } from '../../shared/weatherData';
import { LogController } from '../controllers/LogController';
import { CornerDownLeft } from 'lucide-react';
import { DateTimeUtils } from '../utilities/DateTimeUtils';


interface ServiceData {
    dailyInvocations: number;
    lastInvocation: Date;
    latitude: string;
    longitude: string;
    currentLocation: string;
}

interface DailyForcastResponse {
    dt: number;
    sunrise: number;
    sunset: number;
    moonrise: number;
    moonset: number;
    moon_phase: number;
    temp: {
        day: number;
        min: number;
        max: number;
        night: number;
        eve: number;
        morn: number;
    };
    feels_like: {
        day: number;
        night: number;
        eve: number;
        morn: number;
    };
    pressure: number;
    humidity: number;
    dew_point: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: {
        id: number;
        main: string;
        description: string;
        icon: string;
    }[];
    clouds: number;
    pop: number;
    rain?: number;
    snow?: number;
    uvi: number;
}

interface CurrentDataResponse {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    rain?: { '1h': number };
    snow?: { '1h': number};
    weather: {
        id: number;
        main: string;
        description: string;
        icon: string;
    }[];
}

interface OpenWeatherMapResponse {
    lat: number;
    lon: number;
    timezone: string;
    timezone_offset: number;
    current: CurrentDataResponse;
    minutely?: {
        dt: number;
        precipitation: number;
    }[];
    hourly?: {
        dt: number;
        temp: number;
        feels_like: number;
        pressure: number;
        humidity: number;
        dew_point: number;
        uvi: number;
        clouds: number;
        visibility: number;
        wind_speed: number;
        wind_deg: number;
        wind_gust?: number;
        weather: {
            id: number;
            main: string;
            description: string;
            icon: string;
        }[];
        pop?: number;
    }[];
    daily?: DailyForcastResponse[];
    alerts?: {
        sender_name: string;
        event: string;
        start: number;
        end: number;
        description: string;
        tags: string[];
    }[];
}


const updateLocation = async (settings: SystemSettings, owmSettings: WeatherServiceSettings): Promise<ServiceData> => {
    const { location } = owmSettings;
    let data: ServiceData = owmSettings.data as ServiceData;

    if (!data) {
        data = {
            dailyInvocations: 0,
            lastInvocation: new Date(),
            latitude: '',
            longitude: '',
            currentLocation: '',
        };
    }

    if (data.currentLocation !== location) {
        if (/^\d{5}$/.test(location)) { // Check if location is a zip code
            const geoApiUrl = `http://api.openweathermap.org/geo/1.0/zip?zip=${location}&appid=${owmSettings.apiKey}`;
            const geoResponse = await axios.get(geoApiUrl);

            if (geoResponse.status === 200) {
                const geoData = geoResponse.data;
                data.latitude = geoData.lat.toString();
                data.longitude = geoData.lon.toString();
                data.currentLocation = location;
            } else {
                console.error('Error fetching geolocation data:', geoResponse.statusText);
                LogController.writeLog(`Error fetching geolocation data: ${geoResponse.statusText}`, 'ERROR');
                throw new Error('Failed to fetch geolocation data');
            }
        } else if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(location)) { // Check if location is lat, long with optional space
            const [lat, lon] = location.split(',');
            data.latitude = lat.trim();
            data.longitude = lon.trim();
            data.currentLocation = location;
        } else {
            console.error(`Invalid location format ${location}`);
            LogController.writeLog('Invalid location format', 'ERROR');
            throw new Error('Invalid location format');
        }

        settings.weatherServiceSettings['openweathermap'] = {...owmSettings, data};
        await remult.repo(SystemSettings).save(settings);
    }

    return data;
}

export async function fetchWeather(): Promise<WeatherData|null> {
    const settings = await remult.repo(SystemSettings).findFirst();

    if (!settings) {
        console.log('Missing required system settings for weather API');
        LogController.writeLog('Missing required system settings for weather API', 'WARNING');
        return null;
    }

    if (!settings.weatherServiceSettings['openweathermap']) {
        settings.weatherServiceSettings['openweathermap'] = { apiKey: '', location: '', updateInterval: 15 };
        await remult.repo(SystemSettings).save(settings);
    }

    const owmSettings = settings.weatherServiceSettings['openweathermap'];
    const { apiKey, location } = owmSettings;

    if (!apiKey?.trim()) {
        console.error('Missing OpenWeatherMap API key');
        LogController.writeLog('Missing OpenWeatherMap API key', 'ERROR');
        return null;
    }

    if (!location?.trim()) {
        console.error('Missing OpenWeatherMap location');
        LogController.writeLog('Missing OpenWeatherMap location', 'ERROR');
        return null;
    }
    
    let serviceData = owmSettings.data as ServiceData;

    if (!serviceData) {
        serviceData = {
            dailyInvocations: 0,
            lastInvocation: new Date(),
            latitude: '',
            longitude: '',
            currentLocation: '',
        };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastInvocationDate = new Date((serviceData).lastInvocation).toISOString().split('T')[0];

    if (lastInvocationDate !== today) {
        serviceData.dailyInvocations = 0;
    }

    serviceData.dailyInvocations += 1;
    serviceData.lastInvocation = now;
    settings.weatherServiceSettings['openweathermap'] = { ...owmSettings };
    await remult.repo(SystemSettings).save(settings);

    if (serviceData.dailyInvocations >= 750) {
        LogController.writeLog('Exceeded daily invocation limit of 750 for OpenWeatherMap API', 'ERROR');
        return null;
    }

    if (serviceData.dailyInvocations >= 500) {
        LogController.writeLog('Approaching daily invocation limit of 750 for OpenWeatherMap API', 'WARNING');
    }


    serviceData = await updateLocation(settings, owmSettings);
    const { latitude, longitude } = serviceData;
    

    const apiUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&appid=${apiKey}&exclude=minutely,hourly,alerts&units=${settings.measurementUnit}&lang=en`;
    console.log(`Fetching OpenWeatherMap data from ${apiUrl}`);
    const response = await axios.get<OpenWeatherMapResponse>(apiUrl);

    if (response.status !== 200) {
        console.error('Error fetching weather data:', response.statusText);
        LogController.writeLog(`Error fetching weather data: ${response.statusText}`, 'ERROR');
        return null;
    }

    const responseData = response.data;

    const getIconUrl = (icon: string) => {
        if (!icon) {
            return '';
        }
        const sanitizedIcon = encodeURIComponent(icon.trim());

        return `https://openweathermap.org/img/wn/${sanitizedIcon}@2x.png`;
    }

    const fetchCurrentWeatherData = (data?: CurrentDataResponse): WeatherCurrentData => {
        if (!data) {
            return {
                temperature: 0,
                precipitation: 0,
                isDay: 1,
                relativeHumidity: 0,
                cloudCover: 0,
                conditionCode: 0,
                conditionText: '',
                conditionIcon: '',
                windSpeed: 0,
                windDirection: 0,
                windGusts: 0,
            } as WeatherCurrentData;
        }
        console.log('Current weather data:', data);
        return {
            temperature: data.temp,
            precipitation: data.weather[0]?.id === 500 ? 1 : 0, // Example logic for precipitation
            rain: data.rain?.['1h'] ? data.rain['1h'] / 25.4 : 0, // Convert mm/h to in/h
            snow: data.snow?.['1h'] ? data.snow['1h'] / 25.4 : 0, // Convert mm/h to in/h
            isDay: data.dt >= data.sunrise && data.dt <= data.sunset ? 1 : 0,
            relativeHumidity: data.humidity,
            cloudCover: data.clouds,
            conditionCode: data.weather[0]?.id || 0,
            conditionText: data.weather[0]?.description || '',
            conditionIcon: getIconUrl(data.weather[0]?.icon),
            windSpeed: data.wind_speed,
            windDirection: data.wind_deg,
            windGusts: data.wind_gust || 0,
            asOf: DateTimeUtils.toDateTimeShortStr(new Date(responseData.current.dt * 1000), settings.timezone),
        } as WeatherCurrentData;
    }

    const fetchWeatherForecastData = (data?: DailyForcastResponse): WeatherForecastData => {
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
                precipitationProbability: 0,
                snowProbability: 0,
                averageHumidity: 0,
                windAverage: 0,
            } as WeatherForecastData;
        }
        return {
            sunrise: DateTimeUtils.isoToTimeShortMed(new Date(data.sunrise * 1000).toISOString(), settings.timezone),
            sunset: DateTimeUtils.isoToTimeShortMed(new Date(data.sunset * 1000).toISOString(), settings.timezone),
            moonrise: DateTimeUtils.isoToTimeShortMed(new Date(data.moonrise * 1000).toISOString(), settings.timezone),
            moonset: DateTimeUtils.isoToTimeShortMed(new Date(data.moonset * 1000).toISOString(), settings.timezone),
            temperatureHigh: data.temp.max,
            temperatureLow: data.temp.min,
            windGusts: data.wind_gust || 0,
            totalPrecipitation: (data.rain || 0) + (data.snow || 0),
            totalRain: data.rain || 0,
            totalSnow: data.snow || 0,
            precipitationProbability: data.pop * 100,
            snowProbability: data.snow ? data.pop * 100 : 0,
            averageHumidity: data.humidity,
            windAverage: data.wind_speed,
            uvIndexMax: data.uvi,
            conditionText: data.weather[0]?.description || '',
            conditionIcon: getIconUrl(data.weather[0]?.icon),
            conditionCode: data.weather[0]?.id || 0,
            asOf: DateTimeUtils.toDateTimeShortStr(new Date(data.dt * 1000), settings.timezone),
        } as WeatherForecastData;
    }

    return {
        service: 'openweathermap',
        temperatureUnit: settings.temperatureUnit === 'F' ? 'F' : 'C',
        measurementUnit: settings.measurementUnit === 'imperial' ? 'imperial' : 'metric',
        latitude: responseData.lat,
        longitude: responseData.lon,
        timezone: responseData.timezone,
        current: fetchCurrentWeatherData(responseData?.current),
        forecast: {
            today: fetchWeatherForecastData(responseData?.daily?.[0] ?? undefined),
            tomorrow: fetchWeatherForecastData(responseData?.daily?.[1] ?? undefined),
        }
    } as WeatherData;
}