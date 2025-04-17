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
    showProbability: number;
    windAverage: number;
    windGusts: number;
    windDirection: number;
    uvIndexMax: number;
    conditionText: string;
    conditionIcon: string;
    conditionCode: number;
}

export interface WeatherData {
    temperatureUnit: 'F' | 'C';
    measurementUnit: 'imperial' | 'metric';
    timezone: string;
    latitude: number;
    longitude: number;
    lastUpdated: string | null;
    current: {
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
    };
    forecast: {
        today: WeatherForecastData;
        tomorrow: WeatherForecastData;
    };
}

