// Note: The order of weather variables in the URL query and the indices below need to match!
export interface WeatherForecastData {
    sunrise: string | null;
    sunset: string | null;
    moonrise: string | null;
    moonset: string | null;
    temperatureHigh: number;
    temperatureLow: number;
    averageHumidity: number;
    totalSnowfall: number;
    totalPrecipitation: number;
    precipitationProbability: number;
    snowProbability: number;
    windAverage: number;
    windGusts: number;
    uvIndexMax: number;
    conditionText: string;
    conditionIcon: string;
    conditionCode: number;
}

export interface WeatherCurrentData {
    temperature: number;
    precipitation: number;
    isDay: number;
    relativeHumidity: number;
    cloudCover: number;
    conditionCode: number;
    conditionText: string;
    conditionIcon: string;
    windSpeed: number;
    windDirection: number;
    windGusts: number;
}

export interface WeatherData {
    temperatureUnit: 'F' | 'C';
    measurementUnit: 'imperial' | 'metric';
    timezone: string;
    latitude: number;
    longitude: number;
    lastUpdated: string | null;
    current: WeatherCurrentData;
    forecast: {
        today: WeatherForecastData;
        tomorrow: WeatherForecastData;
    };
}

