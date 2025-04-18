import axios from "axios";
import { WeatherData } from "../../shared/weatherData";
import { DateTime } from "luxon";

export const weatherCodeMapping: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Drizzle: Light intensity",
    53: "Drizzle: Moderate intensity",
    55: "Drizzle: Dense intensity",
    56: "Freezing Drizzle: Light intensity",
    57: "Freezing Drizzle: Dense intensity",
    61: "Rain: Slight intensity",
    63: "Rain: Moderate intensity",
    65: "Rain: Heavy intensity",
    66: "Freezing Rain: Light intensity",
    67: "Freezing Rain: Heavy intensity",
    71: "Snow fall: Slight intensity",
    73: "Snow fall: Moderate intensity",
    75: "Snow fall: Heavy intensity",
    77: "Snow grains",
    80: "Rain showers: Slight intensity",
    81: "Rain showers: Moderate intensity",
    82: "Rain showers: Violent intensity",
    85: "Snow showers: Slight intensity",
    86: "Snow showers: Heavy intensity",
    95: "Thunderstorm: Slight or moderate",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
};

export interface OpenMateoParameters {
    latitude: number,
    longitude: number,
    timezone: string,
    temperatureUnit: 'F' | 'C',
    measurementUnit: 'imperial' | 'metric',
}

export const fetchWeather = async ({ latitude, longitude, timezone, temperatureUnit, measurementUnit}: OpenMateoParameters): Promise<WeatherData|null> => {
    const params = {
        "latitude": latitude,
        "longitude":longitude,
        "daily": ["sunrise", "sunset", "temperature_2m_max", "temperature_2m_min", "rain_sum", "showers_sum", "snowfall_sum", "precipitation_sum", "precipitation_hours", "precipitation_probability_max", "wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant", "uv_index_max"],
        "current": ["temperature_2m", "precipitation", "rain", "showers", "snowfall", "is_day", "relative_humidity_2m", "cloud_cover", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "weather_code", "pressure_msl", "surface_pressure", "apparent_temperature"],
        "timezone": timezone,
        "forecast_days": 2,
        "temperature_unit": temperatureUnit === "F" ? "fahrenheit" : "celsius",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
    };

    const url = "https://api.open-meteo.com/v1/forecast";
    const queryString = new URLSearchParams({
        latitude: params.latitude.toString(),
        longitude: params.longitude.toString(),
        daily: params.daily.join(","),
        current: params.current.join(","),
        timezone: params.timezone,
        forecast_days: params.forecast_days.toString(),
        temperature_unit: params.temperature_unit,
    }).toString();

    const fullUrl = `${url}?${queryString}`;

    try {
        const response = await axios.get(fullUrl);

        if (response.status !== 200) {
            if (response.status === 400 && response.data?.reason) {
                console.log(`Failed to retrieve weather data: ${response.data.reason}`);
            } else {
                console.log(`Failed to retrieve weather data ${response.status} ${response.statusText}`);
            }
            return null;
        }
        const data = response.data;
        const sunrise = DateTime.fromISO(data.daily.sunrise[0], {zone: data.timezone});
        const sunset = DateTime.fromISO(data.daily.sunset[0], {zone: data.timezone});
        const weatherData: WeatherData = {
            temperatureUnit,
            measurementUnit,
            latitude: latitude,
            longitude: longitude,
            timezone: data.timezone,
            current: {
                temperature: data?.current?.temperature_2m || 0,
                precipitation: data?.current?.precipitation || 0,
                isDay: data?.current?.is_day || 0,
                relativeHumidity: data?.current?.relative_humidity_2m || 0,
                cloudCover: data?.current?.cloud_cover || 0,
                conditionCode: data?.current?.weather_code || 0,
                conditionText: weatherCodeMapping[data?.current?.weather_code] || "Unknown",
                conditionIcon: `https://www.weatherbit.io/static/img/icons/${data?.current?.weather_code}.png`,
                windSpeed: data?.current?.wind_speed_10m || 0,
                windDirection: data?.current?.wind_direction_10m || 0,
                windGusts: data?.current?.wind_gusts_10m || 0
            },
            forecast: {
                today: {
                    sunrise: sunrise.setZone(data.timezone).toISO(),
                    sunset: sunset.setZone(data.timezone).toISO(),
                    temperatureHigh: data?.daily?.temperature_2m_max?.[0] || 0,
                    temperatureLow: data?.daily?.temperature_2m_min?.[0] || 0,
                    totalSnowfall: data?.daily?.snowfall_sum?.[0] || 0,
                    totalPrecipitation: data?.daily?.precipitation_sum?.[0] || 0,
                    precipitationProbability: data?.daily?.precipitation_probability_max?.[0] || 0,
                    windAverage: data?.daily?.wind_speed_10m_max?.[0] || 0,
                    windGusts: data?.daily?.wind_gusts_10m_max?.[0] || 0,
                    uvIndexMax: data?.daily?.uv_index_max?.[0] || 0,
                    conditionText: weatherCodeMapping[data?.daily?.weather_code?.[0]] || "Unknown",
                    conditionIcon: `https://www.weatherbit.io/static/img/icons/${data?.daily?.weather_code?.[0]}.png`,
                    conditionCode: data?.daily?.weather_code?.[0] || 0,
                    moonrise: data?.daily?.moonrise?.[0] || null,
                    moonset: data?.daily?.moonset?.[0] || null,
                    averageHumidity: data?.daily?.precipitation_hours?.[0] || 0,
                    snowProbability: data?.daily?.show_probability?.[0] || 0
                }
                ,
                tomorrow: {
                    sunrise: data?.daily?.sunrise?.[1] ? DateTime.fromISO(data.daily.sunrise[1], { zone: data.timezone }).toISO() : null,
                    sunset: data?.daily?.sunset?.[1] ? DateTime.fromISO(data.daily.sunset[1], { zone: data.timezone }).toISO() : null,
                    temperatureHigh: data?.daily?.temperature_2m_max?.[1] || 0,
                    temperatureLow: data?.daily?.temperature_2m_min?.[1] || 0,
                    totalSnowfall: data?.daily?.snowfall_sum?.[1] || 0,
                    totalPrecipitation: data?.daily?.precipitation_sum?.[1] || 0,
                    precipitationProbability: data?.daily?.precipitation_probability_max?.[1] || 0,
                    windAverage: data?.daily?.wind_speed_10m_max?.[1] || 0,
                    windGusts: data?.daily?.wind_gusts_10m_max?.[1] || 0,
                    uvIndexMax: data?.daily?.uv_index_max?.[1] || 0,
                    conditionText: weatherCodeMapping[data?.daily?.weather_code?.[1]] || "Unknown",
                    conditionIcon: `https://www.weatherbit.io/static/img/icons/${data?.daily?.weather_code?.[1]}.png`,
                    conditionCode: data?.daily?.weather_code?.[1] || 0,
                    moonrise: data?.daily?.moonrise?.[1] || null,
                    moonset: data?.daily?.moonset?.[1] || null,
                    averageHumidity: data?.daily?.precipitation_hours?.[1] || 0,
                    snowProbability: data?.daily?.show_probability?.[1] || 0
                }
            },
            lastUpdated: new Date().toISOString(),
        };

        return weatherData;
    } catch (error) {
        console.error("Error fetching weather data:", error);
        return null;
    }
}


