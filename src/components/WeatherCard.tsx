import React from 'react';
import { Cloud } from 'lucide-react';
import { DateTimeUtils } from '../server/utilities/DateTimeUtils';
import { useStatusContext } from '../hooks/StatusContext';
import { WeatherCurrentData, WeatherForecastData } from '../shared/weatherData';

interface WeatherCardProps {
   
}

const WeatherCard: React.FC<WeatherCardProps> = ({  }) => {
    const systemStatus = useStatusContext();
    if (!systemStatus) {
        return "Loading..."
    }
    
    const renderForecast = (title: string, forecast: WeatherForecastData): JSX.Element => {

        return (
            <div className="space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-700">{title}</p>
                    <img
                        src={forecast.conditionIcon}
                        alt={forecast.conditionText}
                        className="h-8 w-8"
                    />
                </div>
                <p className="flex items-center text-sm text-gray-600">
                <strong>{forecast.conditionText}</strong>
                </p>
                <p className="text-sm text-gray-600">
                <strong>High:</strong> {forecast.temperatureHigh?.toFixed(1)}°{systemStatus.weatherData.temperatureUnit}, <strong>Low:</strong> {forecast.temperatureLow?.toFixed(1)}°{systemStatus?.weatherData?.temperatureUnit}
                </p>
                <p className="text-sm text-gray-600">
                <strong>Precip:</strong> {forecast.totalPrecipitation?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'in' : 'mm'}, <strong>Snow:</strong> {forecast.totalSnow?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'in' : 'mm'}
                </p>
                <p className="text-sm text-gray-600">
                <strong>Precip Probability:</strong> {forecast.precipitationProbability}%
                </p>
                <p className="text-sm text-gray-600">
                <strong>Snow Probability:</strong> {forecast.snowProbability}%
                </p>
                <p className="text-sm text-gray-600">
                <strong>Sunrise:</strong> {forecast.sunrise}, <strong>Sunset:</strong> {forecast.sunset}
                </p>
                <p className="text-sm text-gray-600">
                <strong>Wind:</strong> {forecast.windAverage}
                </p>
                <p className="text-sm text-gray-600">
                <strong>UV Index:</strong> {forecast.uvIndexMax}
                </p>
                <p className="text-xs text-gray-600">
                    {forecast.asOf ? `${forecast.asOf}` : ''}
                </p>
            </div>
        );
    }

    const renderCurrentWeather = (currentWeather: WeatherCurrentData): JSX.Element => {

        return (
            <div className="space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-700">Current</p>
                    <img
                        src={currentWeather.conditionIcon}
                        alt={currentWeather.conditionText}
                        className="h-8 w-8"
                    />
                </div>
                <p className="flex items-center text-sm text-gray-600">
                    <strong>{currentWeather.conditionText}</strong>
                </p>
                <p className="text-sm text-gray-600">
                    <strong>Temp:</strong> {currentWeather.temperature?.toFixed(1)}°{systemStatus.weatherData.temperatureUnit}, <strong>Humidity:</strong> {currentWeather.relativeHumidity?.toFixed(0)}%
                </p>
                <p className="text-sm text-gray-600">
                    <strong>Wind:</strong> {currentWeather.windSpeed?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'mph' : 'kph'}, <strong>Direction:</strong> {currentWeather.windDirection}°
                </p>
                <p className="text-sm text-gray-600">
                    <strong>Rain:</strong> {currentWeather.rain?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'in' : 'mm'}
                    , <strong>Snow:</strong> {currentWeather.snow?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'in' : 'mm'}
                </p>
                <p className="text-xs text-gray-600">
                    {currentWeather.asOf ? `As of: ${currentWeather.asOf}` : ''}
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Weather</h2>
            <div className="flex items-start space-x-3 p-3 mt-4">
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {renderCurrentWeather(systemStatus?.weatherData?.current)}
                        {renderForecast("Today", systemStatus?.weatherData?.forecast?.today)}
                        {renderForecast("Tomorrow", systemStatus?.weatherData?.forecast?.tomorrow)}
                    </div>
                </div>
            </div>

            <div>
                <p className="text-xs text-gray-600">
                        Last Update: {DateTimeUtils.isoToDateTimeShortStr(systemStatus?.weatherData?.lastUpdated, systemStatus?.weatherData?.timezone)}
                </p>
                <p className="text-xs text-gray-600">
                    {systemStatus?.weatherData?.service}
                </p>
            </div>
        </div>
    );
};

export default WeatherCard;