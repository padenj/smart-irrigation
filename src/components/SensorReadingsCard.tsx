import { Thermometer, Droplets, CloudFog } from "lucide-react";
import { useStatusContext } from "../hooks/StatusContext";
import { DateTimeUtils } from "../server/utilities/DateTimeUtils";
import { useSettingsContext } from "../hooks/SettingsContext";
import { SensorSettings } from "../shared/systemSettings";
import { SensorData } from "../shared/systemStatus";

export const SensorReadingsCard: React.FC = () => {
  const systemStatus = useStatusContext();
  const settings = useSettingsContext();
  
  const getSensorsWithData = () : {sensor: SensorSettings, sensorData: SensorData}[] => {
    if (!settings.sensors || !systemStatus?.sensorData) return [];
    return settings.sensors.map((sensor) => ({
      sensor: sensor,
      sensorData: systemStatus.sensorData[sensor.name] || null,
    }));
  };
  return ( 
    <div className="bg-white rounded-lg shadow-sm border p-6">
    
    <h2 className="text-lg font-medium text-gray-900 mt-6 mb-4">Sensor Data</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {getSensorsWithData().map(({sensor, sensorData}) => (

      <div key={sensor.name} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
        <div className="flex-shrink-0">
        {sensor.sensorType === "temperature" && <Thermometer className="h-6 w-6 text-green-600" />}
        {sensor.sensorType === "moisture" && <Droplets className="h-6 w-6 text-green-600" />}
        {sensor.sensorType === "humidity" && <CloudFog className="h-6 w-6 text-green-600" />}
        </div>
        <div>
        <p className="text-sm text-gray-500">{sensor.name}</p>
        <p className="text-lg font-medium">{sensorData?.convertedValue||0} {sensorData?.unit}</p>
        <p className="text-sm text-gray-400">Last Updated: {sensorData?.lastUpdated ? DateTimeUtils.isoToDateTimeShortStr(sensorData.lastUpdated, settings.timezone) : "N/A"}</p>
        </div>
      </div>
      ))}
    </div>
    </div>
  )
};
