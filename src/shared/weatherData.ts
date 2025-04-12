// Note: The order of weather variables in the URL query and the indices below need to match!
export interface WeatherData {
    temperatureUnit: 'F' | 'C';
    timezone: string;
    latitude: number;
    longitude: number;
    lastUpdated: string | null;
    current: {
        temperature: number;
        precipitation: number;
        rain: number;
        showers: number;
        snowfall: number;
        isDay: number;
        relativeHumidity2m: number;
        cloudCover: number;
        weatherCode: number;
        weatherCodeText: string;
        windSpeed10m: number;
        windDirection10m: number;
        windGusts10m: number;
        pressureMsl: number;
        surfacePressure: number;
        apparentTemperature: number;
    };
    forecast: {
        sunrise: string | null;
        sunset: string | null;
        temperature2mMax: number;
        temperature2mMin: number;
        rainSum: number;
        showersSum: number;
        snowfallSum: number;
        precipitationSum: number;
        precipitationHours: number;
        precipitationProbabilityMax: number;
        windSpeed10mMax: number;
        windGusts10mMax: number;
        windDirection10mDominant: number;
        uvIndexMax: number;
    };
}

