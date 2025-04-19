// Note: The order of weather variables in the URL query and the indices below need to match!
export interface WeatherForecastData {
    sunrise: string | null;
    sunset: string | null;
    moonrise: string | null;
    moonset: string | null;
    temperatureHigh: number;
    temperatureLow: number;
    averageHumidity: number;
    totalRain: number;
    totalSnow: number;
    totalPrecipitation: number;
    precipitationProbability: number;
    rainProbability: number;
    snowProbability: number;
    windAverage: number;
    windGusts: number;
    uvIndexMax: number;
    conditionText: string;
    conditionIcon: string;
    conditionCode: number;
    asOf: string | null;
}

export interface WeatherCurrentData {
    temperature: number;
    precipitation: number;
    rain: number;
    snow: number;
    isDay: number;
    relativeHumidity: number;
    cloudCover: number;
    conditionCode: number;
    conditionText: string;
    conditionIcon: string;
    windSpeed: number;
    windDirection: number;
    windGusts: number;
    asOf: string | null;
}

export interface WeatherData {
    service: string;
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

