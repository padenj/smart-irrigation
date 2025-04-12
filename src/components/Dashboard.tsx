import { Droplets, Clock, Cloud, CloudRain, ThermometerSun } from 'lucide-react';

import SystemStatusCard from './SystemStatusCard';
import { useStatusContext } from './StatusContext';
import { Program } from '../shared/programs';
import { remult } from 'remult';
import { DateTimeUtils } from '../server/utilities/DateTimeUtils';
import { useSettingsContext } from './SettingsContext';
import React from 'react';

interface DashboardProps {
}


export function Dashboard({}: DashboardProps) {
  
  const systemStatus = useStatusContext();
  const systemSettings = useSettingsContext();
  const programRepo = remult.repo(Program);
  const [nextProgram, setNextProgram] = React.useState<Program | null>(null);

  React.useEffect(() => {
    const fetchNextProgram = async () => {
      const programs = await programRepo.find({
        where: { isEnabled: true },
      });
      const nextProgram = programs
        .map(program => ({
          program,
          nextScheduledRunTime: DateTimeUtils.fromISODateTime(program.nextScheduledRunTime, systemSettings.timezone),
        }))
        .sort((a, b) => (a.nextScheduledRunTime?.getTime() ?? 0) - (b.nextScheduledRunTime?.getTime() ?? 0))[0] || null;
      setNextProgram(nextProgram.program);
    };
    fetchNextProgram();
  }, [programRepo]);


  if (!systemStatus) {
    return "Loading..."
  }
  return (
    <div className="space-y-6">
      {/* Weather Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
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
              <p className="text-lg font-medium">{systemStatus?.weatherData?.current.relativeHumidity2m?.toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <CloudRain className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Precipitation</p>
              <p className="text-lg font-medium">{systemStatus?.weatherData?.current.precipitation?.toFixed(1)}mm</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Cloud className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Current</p>
              <p className="text-lg font-medium">{systemStatus?.weatherData?.current.weatherCodeText}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Zones */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Active Zones</h2>
        {systemStatus?.activeZone ? (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Droplets className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900">{systemStatus.activeZone.name}</p>
                <p className="text-sm text-green-600">
                  Started at: {systemStatus.activeZoneStarted?.toLocaleTimeString()} - Ends at: {systemStatus.activeZoneEnd?.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-left py-4">No zones running</p>
        )}
      </div>

      {/* Next Scheduled */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Next Scheduled Watering</h2>
        {nextProgram ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{nextProgram.name}</p>
                <p className="text-sm text-gray-600">
                  Starts at {DateTimeUtils.isoToDateTimeShortStr(nextProgram.nextScheduledRunTime, systemSettings.timezone)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-left py-4">No programs scheduled</p>
        )}
      </div>

      {/* System Status */}
      <SystemStatusCard />
    </div>
  );
}