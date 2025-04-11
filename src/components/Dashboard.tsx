import { Droplets, Clock, Cloud, CloudRain, ThermometerSun } from 'lucide-react';

import SystemStatusCard from './SystemStatusCard';
import { useStatusContext } from './StatusContext';
import { Program } from '../shared/programs';
import { remult } from 'remult';
import { DateTimeUtils } from '../server/systemController';
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
  
  // const activeZones = systemStatus.zones.filter(zone => zone.isActive);
  // const nextSchedule = React.useMemo(() => {
  //   const now = new Date();
  //   const schedules = systemStatus.zones
  //     .filter(zone => zone.enabled)
  //     .flatMap(zone => 
  //       zone.schedule
  //         .filter(schedule => schedule.enabled)
  //         .map(schedule => ({
  //           zoneName: zone.name,
  //           zoneId: zone.id,
  //           startTime: schedule.startTime,
  //           duration: schedule.duration,
  //           days: schedule.days
  //         }))
  //     )
  //     .filter(schedule => {
  //       const [hours, minutes] = schedule.startTime.split(':').map(Number);
  //       const scheduleTime = new Date();
  //       scheduleTime.setHours(hours, minutes, 0, 0);
  //       return scheduleTime > now && schedule.days.includes(now.toLocaleDateString('en-US', { weekday: 'monday' }).toLowerCase());
  //     })
  //     .sort((a, b) => {
  //       const [aHours, aMinutes] = a.startTime.split(':').map(Number);
  //       const [bHours, bMinutes] = b.startTime.split(':').map(Number);
  //       return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
  //     });

  //   return schedules[0];
  // }, [systemStatus.zones]);

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
              <p className="text-lg font-medium">{systemStatus?.weatherData?.temperatureF?.toFixed(1)}°C</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Droplets className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Humidity</p>
              <p className="text-lg font-medium">{systemStatus?.weatherData?.humidity?.toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <CloudRain className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Precipitation</p>
              <p className="text-lg font-medium">{systemStatus?.weatherData?.precipitation?.toFixed(1)}mm</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Cloud className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Forecast</p>
              <p className="text-lg font-medium">{systemStatus?.weatherData?.forecast}</p>
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