import { ThermometerSun, Droplets, CloudRain } from "lucide-react";
import { useStatusContext } from "../hooks/StatusContext";

export const ExampleCard: React.FC = () => {
    const systemStatus = useStatusContext();
    
    return ( <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Weather</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <ThermometerSun className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Temperature</p>
              <p className="text-lg font-medium">{systemStatus?.weatherData?.current.temperature?.toFixed(1)}°{systemStatus?.weatherData?.temperatureUnit}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Droplets className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Humidity</p>
              <p className="text-lg font-medium">{systemStatus?.weatherData?.current.relativeHumidity?.toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <CloudRain className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Precipitation</p>
                <p className="text-lg font-medium">
                {systemStatus?.weatherData?.current.precipitation?.toFixed(1)} {systemStatus?.weatherData?.measurementUnit === "imperial" ? 'in' : "mm"}
                </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <img src={systemStatus?.weatherData?.current.conditionIcon} alt="Weather Icon" className="h-6 w-6" />
            <div>
              <p className="text-sm text-gray-500">Current</p>
              <p className="text-lg font-medium">{systemStatus?.weatherData?.current.conditionText}</p>
            </div>
          </div>
        </div>
      </div>
    )
};
