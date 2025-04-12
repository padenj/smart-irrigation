import React from 'react';
import { Cloud } from 'lucide-react';
import { DateTimeUtils } from '../server/utilities/DateTimeUtils';
import { useStatusContext } from './StatusContext';

interface WeatherCardProps {
   
}

const WeatherCard: React.FC<WeatherCardProps> = ({  }) => {
    const systemStatus = useStatusContext();
    if (!systemStatus) {
        return "Loading..."
    }
    
    return (
        <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg mt-4">
          <Cloud className="h-6 w-6 text-blue-600 mt-1" />
            <div>
            <p className="font-medium text-gray-900">
                Weather: {systemStatus?.weatherData?.current.weatherCodeText}
            </p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                <p className="text-sm text-gray-600">
                    Temp: {systemStatus?.weatherData?.current.temperature?.toFixed(1)}°{systemStatus.weatherData.temperatureUnit}, Humidity: {systemStatus?.weatherData?.current.relativeHumidity2m?.toFixed(0)}%
                </p>
                <p className="text-sm text-gray-600">
                    Wind: {systemStatus?.weatherData?.current.windSpeed10m?.toFixed(1)} m/s, Direction: {systemStatus?.weatherData?.current.windDirection10m}°
                </p>
                <p className="text-sm text-gray-600">
                    Precipitation: {systemStatus?.weatherData?.current.precipitation?.toFixed(1)} mm
                </p>
                <p className="text-sm text-gray-600">
                    Sunrise: {DateTimeUtils.isoToDateTimeShortStr(systemStatus?.weatherData?.forecast.sunrise, systemStatus?.weatherData?.timezone)},
                    Sunset: {DateTimeUtils.isoToDateTimeShortStr(systemStatus?.weatherData?.forecast.sunset, systemStatus?.weatherData?.timezone)}
                </p>
                <p className="text-sm text-gray-600">
                    High: {systemStatus?.weatherData?.forecast.temperature2mMax?.toFixed(1)}°{systemStatus.weatherData.temperatureUnit}, Low: {systemStatus?.weatherData?.forecast.temperature2mMin?.toFixed(1)}°{systemStatus?.weatherData?.temperatureUnit}
                </p>
                <p className="text-sm text-gray-600">
                    Rain: {systemStatus?.weatherData?.forecast.rainSum?.toFixed(1)} mm, Snow: {systemStatus?.weatherData?.forecast.snowfallSum?.toFixed(1)} mm
                </p>
                </div>
                <div>
                <p className="text-sm text-gray-600">
                    Wind Gusts: {systemStatus?.weatherData?.forecast.windGusts10mMax?.toFixed(1)} m/s
                </p>
                <p className="text-sm text-gray-600">
                    UV Index: {systemStatus?.weatherData?.forecast.uvIndexMax}
                </p>
                <p className="text-sm text-gray-600">
                    Precipitation Probability: {systemStatus?.weatherData?.forecast.precipitationProbabilityMax}%
                </p>
                <p className="text-sm text-gray-600">
                    Precipitation Hours: {systemStatus?.weatherData?.forecast.precipitationHours} hours
                </p>
                <p className="text-sm text-gray-600">
                    Dominant Wind Direction: {systemStatus?.weatherData?.forecast.windDirection10mDominant}°
                </p>
                </div>

                <p className="text-sm text-gray-600">
                    Last Update: {DateTimeUtils.isoToDateTimeShortStr(systemStatus?.weatherData?.lastUpdated, systemStatus?.weatherData?.timezone)}
                </p>
            </div>
            </div>
        </div>
    );
};

export default WeatherCard;