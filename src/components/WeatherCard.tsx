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
                    Weather: 
                </p>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="font-medium text-gray-700">Current</p>
                        <p className="flex items-center text-sm text-gray-600">
                            <img
                                src={systemStatus?.weatherData?.current.conditionIcon}
                                alt={systemStatus?.weatherData?.current.conditionText}
                                className="h-5 w-5 mr-2"
                            />
                            {systemStatus?.weatherData?.current.conditionText}
                        </p>
                    <p className="text-sm text-gray-600">
                        Temp: {systemStatus?.weatherData?.current.temperature?.toFixed(1)}°{systemStatus.weatherData.temperatureUnit}, Humidity: {systemStatus?.weatherData?.current.relativeHumidity?.toFixed(0)}%
                    </p>
                    <p className="text-sm text-gray-600">
                        {systemStatus?.weatherData?.current.windSpeed?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'mph' : 'kph'}, Direction: {systemStatus?.weatherData?.current.windDirection}°
                    </p>
                    <p className="text-sm text-gray-600">
                        Precipitation: {systemStatus?.weatherData?.current.precipitation?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'in' : 'mm'}
                    </p>
                    
                    </div>
                    <div>

                        <p className="font-medium text-gray-700">Today</p>
                        <p className="flex items-center text-sm text-gray-600">
                            <img
                                src={systemStatus?.weatherData?.forecast?.today?.conditionIcon}
                                alt={systemStatus?.weatherData?.forecast?.today?.conditionText}
                                className="h-5 w-5 mr-2"
                            />
                            {systemStatus?.weatherData?.forecast?.today?.conditionText}
                        </p>
                        
                        <p className="text-sm text-gray-600">
                            High: {systemStatus?.weatherData?.forecast?.today?.temperatureHigh.toFixed(1)}°{systemStatus.weatherData.temperatureUnit}, Low: {systemStatus?.weatherData?.forecast?.today?.temperatureLow?.toFixed(1)}°{systemStatus?.weatherData?.temperatureUnit}
                        </p>
                        <p className="text-sm text-gray-600">
                            {systemStatus?.weatherData?.forecast?.today?.totalPrecipitation?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'in' : 'mm'}, Snow: {systemStatus?.weatherData?.forecast?.today?.totalSnowfall?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'in' : 'mm'}
                        </p>
                        <p className="text-sm text-gray-600">
                            Precipitation Probability: {systemStatus?.weatherData?.forecast?.today?.precipitationProbability}%
                        </p>
                        <p className="text-sm text-gray-600">
                            Sunrise: {systemStatus?.weatherData?.forecast?.today?.sunrise},
                            Sunset: {systemStatus?.weatherData?.forecast?.today?.sunset}
                        </p>
                        <p className="text-sm text-gray-600">
                            Wind: {systemStatus?.weatherData?.forecast?.today?.windAverage} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'mph' : 'kph'}, Direction: {systemStatus?.weatherData?.forecast?.today?.windDirection}°
                        </p>
                        <p className="text-sm text-gray-600">
                            UV Index: {systemStatus?.weatherData?.forecast?.today?.uvIndexMax}
                        </p>
                    </div>
                    <div>
                        <p className="font-medium text-gray-700">Tomorrow</p>
                        <p className="flex items-center text-sm text-gray-600">
                            <img
                                src={systemStatus?.weatherData?.forecast?.tomorrow?.conditionIcon}
                                alt={systemStatus?.weatherData?.forecast?.tomorrow?.conditionText}
                                className="h-5 w-5 mr-2"
                            />
                            {systemStatus?.weatherData?.forecast?.tomorrow?.conditionText}
                        </p>
                        <p className="text-sm text-gray-600">
                            High: {systemStatus?.weatherData?.forecast?.tomorrow?.temperatureHigh?.toFixed(1)}°{systemStatus.weatherData.temperatureUnit}, Low: {systemStatus?.weatherData?.forecast?.tomorrow?.temperatureLow?.toFixed(1)}°{systemStatus?.weatherData?.temperatureUnit}
                        </p>
                        <p className="text-sm text-gray-600">
                            Rain: {systemStatus?.weatherData?.forecast?.tomorrow?.totalPrecipitation?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'in' : 'mm'}, Snow: {systemStatus?.weatherData?.forecast?.tomorrow?.totalSnowfall?.toFixed(1)} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'in' : 'mm'}
                        </p>
                        <p className="text-sm text-gray-600">
                            Precipitation Probability: {systemStatus?.weatherData?.forecast?.tomorrow?.precipitationProbability}%
                        </p>
                        <p className="text-sm text-gray-600">
                            Sunrise: {systemStatus?.weatherData?.forecast?.tomorrow?.sunrise},
                            Sunset: {systemStatus?.weatherData?.forecast?.tomorrow?.sunset}
                        </p>
                        <p className="text-sm text-gray-600">
                            Wind: {systemStatus.weatherData?.forecast?.tomorrow?.windAverage} {systemStatus.weatherData.measurementUnit === 'imperial' ? 'mph' : 'kph'}, Direction: {systemStatus?.weatherData?.forecast?.tomorrow?.windDirection}°
                        </p>
                        <p className="text-sm text-gray-600">
                            UV Index: {systemStatus?.weatherData?.forecast?.tomorrow?.uvIndexMax}
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