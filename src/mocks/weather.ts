interface WeatherData {
  temperature: number;
  humidity: number;
  isRaining: boolean;
  precipitation: number;
  forecast: string;
}

export const mockWeatherService = {
  getCurrentWeather: async (): Promise<WeatherData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      temperature: 20 + Math.random() * 10,
      humidity: 40 + Math.random() * 30,
      isRaining: Math.random() > 0.8,
      precipitation: Math.random() * 5,
      forecast: 'Partly Cloudy',
    };
  },
};