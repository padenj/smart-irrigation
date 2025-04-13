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
}

export const fetchWeather = async ({ latitude, longitude, timezone, temperatureUnit}: OpenMateoParameters): Promise<WeatherData|null> => {
    const params = {
        "latitude": latitude,
        "longitude":longitude,
        "daily": ["sunrise", "sunset", "temperature_2m_max", "temperature_2m_min", "rain_sum", "showers_sum", "snowfall_sum", "precipitation_sum", "precipitation_hours", "precipitation_probability_max", "wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant", "uv_index_max"],
        "current": ["temperature_2m", "precipitation", "rain", "showers", "snowfall", "is_day", "relative_humidity_2m", "cloud_cover", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "weather_code", "pressure_msl", "surface_pressure", "apparent_temperature"],
        "timezone": timezone,
        "forecast_days": 1,
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
            temperatureUnit: temperatureUnit,
            latitude: latitude,
            longitude: longitude,
            timezone: data.timezone,
            current: {
                temperature: data?.current?.temperature_2m || 0,
                precipitation: data?.current?.precipitation || 0,
                rain: data?.current?.rain || 0,
                showers: data?.current?.showers || 0,
                snowfall: data?.current?.snowfall || 0,
                isDay: data?.current?.is_day || 0,
                relativeHumidity2m: data?.current?.relative_humidity_2m || 0,
                cloudCover: data?.current?.cloud_cover || 0,
                weatherCode: data?.current?.weather_code || 0,
                weatherCodeText: weatherCodeMapping[data?.current?.weather_code] || "Unknown",
                windSpeed10m: data?.current?.wind_speed_10m || 0,
                windDirection10m: data?.current?.wind_direction_10m || 0,
                windGusts10m: data?.current?.wind_gusts_10m || 0,
                pressureMsl: data?.current?.pressure_msl || 0,
                surfacePressure: data?.current?.surface_pressure || 0,
                apparentTemperature: data?.current?.apparent_temperature || 0,
            },
            forecast: {
                sunrise: sunrise.setZone(data.timezone).toISO(),
                sunset: sunset.setZone(data.timezone).toISO(),
                temperature2mMax: data?.daily?.temperature_2m_max?.[0] || 0,
                temperature2mMin: data?.daily?.temperature_2m_min?.[0] || 0,
                rainSum: data?.daily?.rain_sum?.[0] || 0,
                showersSum: data?.daily?.showers_sum?.[0] || 0,
                snowfallSum: data?.daily?.snowfall_sum?.[0] || 0,
                precipitationSum: data?.daily?.precipitation_sum?.[0] || 0,
                precipitationHours: data?.daily?.precipitation_hours?.[0] || 0,
                precipitationProbabilityMax: data?.daily?.precipitation_probability_max?.[0] || 0,
                windSpeed10mMax: data?.daily?.wind_speed_10m_max?.[0] || 0,
                windGusts10mMax: data?.daily?.wind_gusts_10m_max?.[0] || 0,
                windDirection10mDominant: data?.daily?.wind_direction_10m_dominant?.[0] || 0,
                uvIndexMax: data?.daily?.uv_index_max?.[0] || 0,
            },
            lastUpdated: new Date().toISOString(),
        };
        
        console.log("Current Weather:");
        console.log(`Temperature (2m): ${weatherData.current.temperature}°F`);
        console.log(`Precipitation: ${weatherData.current.precipitation}mm`);
        console.log(`Rain: ${weatherData.current.rain}mm`);
        console.log(`Showers: ${weatherData.current.showers}mm`);
        console.log(`Snowfall: ${weatherData.current.snowfall}mm`);
        console.log(`Is Day: ${weatherData.current.isDay ? "Yes" : "No"}`);
        console.log(`Relative Humidity (2m): ${weatherData.current.relativeHumidity2m}%`);
        console.log(`Cloud Cover: ${weatherData.current.cloudCover}%`);
        console.log(`Weather Code: ${weatherData.current.weatherCode} (${weatherData.current.weatherCodeText})`);
        console.log(`Wind Speed (10m): ${weatherData.current.windSpeed10m} m/s`);
        console.log(`Wind Direction (10m): ${weatherData.current.windDirection10m}°`);
        console.log(`Wind Gusts (10m): ${weatherData.current.windGusts10m} m/s`);
        console.log(`Pressure (MSL): ${weatherData.current.pressureMsl} hPa`);
        console.log(`Surface Pressure: ${weatherData.current.surfacePressure} hPa`);
        console.log(`Apparent Temperature: ${weatherData.current.apparentTemperature}°F`);
        console.log("Forecast:");
        console.log(`Sunrise: ${weatherData.forecast.sunrise}`);
        console.log(`Sunset: ${weatherData.forecast.sunset}`);
        console.log(`Max Temperature (2m): ${weatherData.forecast.temperature2mMax}°F`);
        console.log(`Min Temperature (2m): ${weatherData.forecast.temperature2mMin}°F`);
        console.log(`Rain Sum: ${weatherData.forecast.rainSum}mm`);
        console.log(`Showers Sum: ${weatherData.forecast.showersSum}mm`);
        console.log(`Snowfall Sum: ${weatherData.forecast.snowfallSum}mm`);
        console.log(`Precipitation Sum: ${weatherData.forecast.precipitationSum}mm`);
        console.log(`Precipitation Hours: ${weatherData.forecast.precipitationHours} hours`);
        console.log(`Max Precipitation Probability: ${weatherData.forecast.precipitationProbabilityMax}%`);
        console.log(`Max Wind Speed (10m): ${weatherData.forecast.windSpeed10mMax} m/s`);
        console.log(`Max Wind Gusts (10m): ${weatherData.forecast.windGusts10mMax} m/s`);
        console.log(`Dominant Wind Direction (10m): ${weatherData.forecast.windDirection10mDominant}°`);
        console.log(`Max UV Index: ${weatherData.forecast.uvIndexMax}`);
        console.log("Weather data fetched successfully.");
        console.log("Weather data:", weatherData);

        return weatherData;
    } catch (error) {
        console.error("Error fetching weather data:", error);
        return null;
    }
}


