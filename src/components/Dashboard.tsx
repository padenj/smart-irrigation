import React from 'react';
import { Droplets, Clock, AlertTriangle, Sun, Cloud, CloudRain, ThermometerSun } from 'lucide-react';
import { SystemStatus, Zone } from '../types';

interface DashboardProps {
  systemStatus: SystemStatus;
  onToggleZone: (zone: Zone) => void;
}

export function Dashboard({ systemStatus, onToggleZone }: DashboardProps) {
  const activeZones = systemStatus.zones.filter(zone => zone.isActive);
  const nextSchedule = React.useMemo(() => {
    const now = new Date();
    const schedules = systemStatus.zones
      .filter(zone => zone.enabled)
      .flatMap(zone => 
        zone.schedule
          .filter(schedule => schedule.enabled)
          .map(schedule => ({
            zoneName: zone.name,
            zoneId: zone.id,
            startTime: schedule.startTime,
            duration: schedule.duration,
            days: schedule.days
          }))
      )
      .filter(schedule => {
        const [hours, minutes] = schedule.startTime.split(':').map(Number);
        const scheduleTime = new Date();
        scheduleTime.setHours(hours, minutes, 0, 0);
        return scheduleTime > now && schedule.days.includes(now.toLocaleDateString('en-US', { weekday: 'monday' }).toLowerCase());
      })
      .sort((a, b) => {
        const [aHours, aMinutes] = a.startTime.split(':').map(Number);
        const [bHours, bMinutes] = b.startTime.split(':').map(Number);
        return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
      });

    return schedules[0];
  }, [systemStatus.zones]);

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
              <p className="text-lg font-medium">{systemStatus.weatherData.temperature.toFixed(1)}°C</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Droplets className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Humidity</p>
              <p className="text-lg font-medium">{systemStatus.weatherData.humidity.toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <CloudRain className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Precipitation</p>
              <p className="text-lg font-medium">{systemStatus.weatherData.precipitation.toFixed(1)}mm</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Cloud className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Forecast</p>
              <p className="text-lg font-medium">{systemStatus.weatherData.forecast}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Zones */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Active Zones</h2>
        {activeZones.length > 0 ? (
          <div className="space-y-3">
            {activeZones.map(zone => (
              <div key={zone.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Droplets className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">{zone.name}</p>
                    <p className="text-sm text-green-600">Moisture Level: {zone.moistureLevel}%</p>
                  </div>
                </div>
                <button
                  onClick={() => onToggleZone(zone)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Stop
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No zones are currently active</p>
        )}
      </div>

      {/* Next Scheduled */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Next Scheduled Watering</h2>
        {nextSchedule ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{nextSchedule.zoneName}</p>
                <p className="text-sm text-gray-600">
                  Starts at {nextSchedule.startTime} ({nextSchedule.duration} minutes)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No upcoming schedules</p>
        )}
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          {systemStatus.operational ? (
            <Sun className="h-6 w-6 text-green-600" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-red-600" />
          )}
          <div>
            <p className="font-medium text-gray-900">
              System is {systemStatus.operational ? 'Operational' : 'Having Issues'}
            </p>
            <p className="text-sm text-gray-600">
              Last Update: {systemStatus.lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}